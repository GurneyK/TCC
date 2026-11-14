import type { Counterparty, Payment, TreasurySnapshot } from "@/data/types";
import { daysBetween, isoDate, minutesBetween } from "@/lib/dates";
import { formatWithCode, toUsd } from "@/lib/money";
import { buildPaymentHistory, type CounterpartyHistory } from "@/lib/paymentHistory";
import { nameSimilarity } from "@/lib/similarity";
import { SEVERITY_RANK, type AgentRun, type EvidenceRef, type Finding, type RecommendationAction, type Severity } from "./types";

interface Check {
  key: "bank_change" | "duplicate" | "watchlist" | "unusual_amount" | "new_geography";
  severity: Severity;
  weight: number;
  title: string;
  reason: string;
  evidence: EvidenceRef[];
  action: RecommendationAction;
  label: string;
  confidence: number;
}

export interface PaymentAssessment {
  paymentId: string;
  score: number;
  checks: Check[];
}

function nearIdentical(a: string, b: string) {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.length - short.length === 1 && long.startsWith(short);
}

function assess(
  payment: Payment,
  snapshot: TreasurySnapshot,
  history: Map<string, CounterpartyHistory>,
  cps: Map<string, Counterparty>,
): PaymentAssessment {
  const today = isoDate(snapshot.now);
  const cp = cps.get(payment.counterpartyId);
  const checks: Check[] = [];
  if (!cp) return { paymentId: payment.id, score: 0, checks };
  const amount = formatWithCode(payment.amount, { compact: true });
  const payEvidence: EvidenceRef = { type: "payment", id: payment.id, label: `${amount} to ${cp.name}` };
  const cpEvidence: EvidenceRef = { type: "counterparty", id: cp.id, label: cp.name };

  if (cp.bankDetailsChangedAt) {
    const days = daysBetween(cp.bankDetailsChangedAt, today);
    if (days <= 30) {
      const critical = days < 7;
      checks.push({
        key: "bank_change",
        severity: critical ? "critical" : "high",
        weight: critical ? 70 : 45,
        title: `Bank details changed ${days} day${days === 1 ? "" : "s"} before a ${amount} payment`,
        reason: `${cp.name} changed its bank account to ${cp.maskedBankAccount ?? "a new account"} ${days} day${days === 1 ? "" : "s"} ago. Changing bank details just before a large payment is the classic invoice fraud pattern.`,
        evidence: [payEvidence, cpEvidence],
        action: "verify_callback",
        label: "Hold and verify by callback",
        confidence: critical ? 0.92 : 0.8,
      });
    }
  }

  const invoiceNumbers = payment.invoiceIds.map((id) => snapshot.invoices.find((i) => i.id === id)?.number ?? id);
  const twin = snapshot.payments.find((other) => {
    if (other.id === payment.id || other.counterpartyId !== payment.counterpartyId || other.status === "rejected") return false;
    const close = Math.abs(minutesBetween(other.createdAt, payment.createdAt)) <= 14 * 24 * 60;
    const sameAmount = other.amount.currency === payment.amount.currency && other.amount.minor === payment.amount.minor;
    const otherNumbers = other.invoiceIds.map((id) => snapshot.invoices.find((i) => i.id === id)?.number ?? id);
    const similarRef = otherNumbers.some((a) => invoiceNumbers.some((b) => nearIdentical(a, b)));
    return close && (sameAmount || similarRef);
  });
  if (twin) {
    const twinNumbers = twin.invoiceIds.map((id) => snapshot.invoices.find((i) => i.id === id)?.number ?? id);
    const gap = Math.round(Math.abs(minutesBetween(twin.createdAt, payment.createdAt)) / (60 * 24));
    checks.push({
      key: "duplicate",
      severity: "high",
      weight: 45,
      title: `Likely duplicate payment to ${cp.name}`,
      reason: `Another payment of ${formatWithCode(twin.amount)} to ${cp.name} was created ${gap} day${gap === 1 ? "" : "s"} apart. Invoices ${twinNumbers.join(", ")} and ${invoiceNumbers.join(", ")} look like the same bill entered twice.`,
      evidence: [payEvidence, { type: "payment", id: twin.id, label: `Earlier payment ${twin.id}` }, ...payment.invoiceIds.map((id, i) => ({ type: "invoice" as const, id, label: invoiceNumbers[i] }))],
      action: "hold_payment",
      label: "Hold as likely duplicate",
      confidence: 0.88,
    });
  }

  const match = snapshot.watchlist
    .map((w) => ({ w, score: nameSimilarity(cp.name, w.name) }))
    .sort((a, b) => b.score - a.score)[0];
  if (match && match.score >= 0.85) {
    checks.push({
      key: "watchlist",
      severity: "critical",
      weight: 85,
      title: `${cp.name} is a ${Math.round(match.score * 100)}% match to a watchlist name`,
      reason: `"${cp.name}" is a ${Math.round(match.score * 100)}% name match to "${match.w.name}" on the ${match.w.list}. It needs a compliance decision before any money moves.`,
      evidence: [payEvidence, cpEvidence, { type: "watchlist", id: match.w.id, label: match.w.name }],
      action: "hold_payment",
      label: "Block pending compliance review",
      confidence: match.score,
    });
  }

  const h = history.get(cp.name);
  if (h && h.count >= 2 && payment.amount.minor > h.medianMinor * 3) {
    const multiple = payment.amount.minor / h.medianMinor;
    checks.push({
      key: "unusual_amount",
      severity: "medium",
      weight: 25,
      title: `Payment is ${multiple.toFixed(1)}x the usual amount for ${cp.name}`,
      reason: `The 6 month median payment to ${cp.name} is ${formatWithCode({ minor: h.medianMinor, currency: payment.amount.currency })}. This one is ${multiple.toFixed(1)} times that.`,
      evidence: [payEvidence, cpEvidence],
      action: "review",
      label: "Confirm the amount with the requester",
      confidence: 0.7,
    });
  }
  if (h && h.count >= 1 && !h.entityIds.has(payment.entityId)) {
    const entity = snapshot.entities.find((e) => e.id === payment.entityId);
    checks.push({
      key: "new_geography",
      severity: "medium",
      weight: 20,
      title: `${entity?.name ?? "This entity"} has never paid ${cp.name}`,
      reason: `${cp.name} has only been paid from other entities before. A new paying entity is worth a second look.`,
      evidence: [payEvidence, cpEvidence],
      action: "review",
      label: "Confirm the paying entity",
      confidence: 0.65,
    });
  }

  const usd = toUsd(payment.amount, snapshot.rates).minor / 100;
  const sizeScore = Math.min(10, Math.round(Math.log10(Math.max(usd, 1)) * 1.5));
  const score = Math.min(100, sizeScore + checks.reduce((s, c) => s + c.weight, 0));
  return { paymentId: payment.id, score, checks };
}

export function assessPayments(snapshot: TreasurySnapshot): PaymentAssessment[] {
  const history = buildPaymentHistory(snapshot.transactions, snapshot.accounts, isoDate(snapshot.now));
  const cps = new Map(snapshot.counterparties.map((c) => [c.id, c]));
  return snapshot.payments
    .filter((p) => p.status === "pending_approval" || p.status === "draft")
    .map((p) => assess(p, snapshot, history, cps));
}

export function runPaymentRisk(snapshot: TreasurySnapshot, now: string): AgentRun {
  const pending = snapshot.payments.filter((p) => p.status === "pending_approval");
  const assessments = assessPayments(snapshot).filter((a) => pending.some((p) => p.id === a.paymentId));
  const findings: Finding[] = [];
  const counts = { bank_change: 0, duplicate: 0, watchlist: 0, unusual_amount: 0, new_geography: 0 };

  for (const a of assessments) {
    if (!a.checks.length) continue;
    a.checks.forEach((c) => (counts[c.key] += 1));
    const top = [...a.checks].sort((x, y) => SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity] || y.weight - x.weight)[0];
    const payment = pending.find((p) => p.id === a.paymentId) as Payment;
    const evidence = new Map<string, EvidenceRef>();
    a.checks.flatMap((c) => c.evidence).forEach((e) => evidence.set(`${e.type}-${e.id}`, e));
    findings.push({
      id: `pr-${payment.id}`,
      agentId: "payment_risk",
      severity: top.severity,
      title: top.title,
      summary: `${top.reason.split(". ")[0]}. Risk score ${a.score} out of 100.`,
      reasons: a.checks.map((c) => c.reason),
      evidence: [...evidence.values()],
      confidence: top.confidence,
      recommendation: { action: top.action, label: top.label, amount: payment.amount },
      status: "open",
      createdAt: now,
      impactUsd: toUsd(payment.amount, snapshot.rates).minor,
    });
  }

  return {
    id: `run-payment_risk-${now}`,
    agentId: "payment_risk",
    startedAt: now,
    finishedAt: now,
    inputs: `${pending.length} payments pending approval`,
    steps: [
      { label: "Loaded payment queue", detail: `Loaded ${pending.length} payments pending approval`, durationMs: 80, status: "done" },
      { label: "Bank detail changes", detail: `Bank details changed in the last 30 days: ${counts.bank_change}`, durationMs: 140, status: counts.bank_change ? "warning" : "done" },
      { label: "Duplicate check", detail: `Likely duplicates: ${counts.duplicate}`, durationMs: 210, status: counts.duplicate ? "warning" : "done" },
      { label: "Watchlist screening", detail: `Screened ${pending.length} counterparties against ${snapshot.watchlist.length} watchlist names: ${counts.watchlist} near match`, durationMs: 260, status: counts.watchlist ? "warning" : "done" },
      { label: "Amount check", detail: `Above 3x the 6 month median: ${counts.unusual_amount}`, durationMs: 120, status: counts.unusual_amount ? "warning" : "done" },
      { label: "Paying entity check", detail: `New paying entities: ${counts.new_geography}`, durationMs: 90, status: counts.new_geography ? "warning" : "done" },
    ],
    findings,
  };
}
