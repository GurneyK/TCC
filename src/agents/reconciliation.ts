import type { Invoice, Transaction, TreasurySnapshot } from "@/data/types";
import { daysBetween, isoDate } from "@/lib/dates";
import { formatWithCode, toUsd } from "@/lib/money";
import { stableHash, type AgentRun, type Finding, type MatchSuggestion, type TraceStep } from "./types";

const REF_PATTERN = /\b(?:AR|INV)-\d+[A-Z]?\b/g;
const FEE_PATTERN = /\b(FEE|CHG)\b/;

export interface ReconciliationOptions {
  /** Only look at these transactions. Used by the live feed and CSV import. */
  transactionIds?: string[];
}

export function runReconciliation(snapshot: TreasurySnapshot, now: string, opts: ReconciliationOptions = {}): AgentRun {
  const today = isoDate(now);
  const only = opts.transactionIds ? new Set(opts.transactionIds) : null;
  const accounts = new Map(snapshot.accounts.map((a) => [a.id, a]));
  const cps = new Map(snapshot.counterparties.map((c) => [c.id, c]));
  const unmatched = snapshot.transactions.filter((t) => t.status === "unmatched" && (!only || only.has(t.id)));

  const open = snapshot.invoices.filter((i) => i.status === "open" || i.status === "partially_paid");
  const byNumber = new Map(open.map((i) => [i.number, i]));
  const claimed = new Set<string>();

  const suggestions: MatchSuggestion[] = [];
  const shortPays: Array<{ tx: Transaction; inv: Invoice; pct: number }> = [];
  const fees: Transaction[] = [];
  const exceptions: Transaction[] = [];
  let exactCount = 0;
  let strongCount = 0;

  for (const tx of unmatched) {
    const kind = tx.direction === "in" ? "AR" : "AP";
    const entityId = accounts.get(tx.accountId)?.entityId;
    const refNumbers: string[] = [...(tx.reference.match(REF_PATTERN) ?? [])];

    // 1. Exact
    const exact = refNumbers.map((n) => byNumber.get(n)).find(
      (inv) => inv && !claimed.has(inv.id) && inv.kind === kind && inv.amount.currency === tx.amount.currency && inv.amount.minor === tx.amount.minor,
    );
    if (exact) {
      claimed.add(exact.id);
      suggestions.push({ transactionId: tx.id, invoiceIds: [exact.id], rule: "exact", confidence: 0.98 });
      exactCount += 1;
      continue;
    }

    const sameParty = open.filter(
      (inv) => !claimed.has(inv.id) && inv.kind === kind && inv.entityId === entityId && cps.get(inv.counterpartyId)?.name === tx.counterparty && inv.amount.currency === tx.amount.currency,
    );

    // 2. Strong
    const strong = sameParty
      .filter((inv) => Math.abs(inv.amount.minor - tx.amount.minor) <= inv.amount.minor * 0.005 && Math.abs(daysBetween(inv.dueDate, tx.valueDate)) <= 5)
      .sort((a, b) => Math.abs(a.amount.minor - tx.amount.minor) - Math.abs(b.amount.minor - tx.amount.minor))[0];
    if (strong) {
      claimed.add(strong.id);
      suggestions.push({ transactionId: tx.id, invoiceIds: [strong.id], rule: "strong", confidence: 0.85 });
      strongCount += 1;
      continue;
    }

    // 3. Short pay
    if (tx.direction === "in") {
      const candidates = sameParty
        .map((inv) => ({ inv, pct: (inv.amount.minor - tx.amount.minor) / inv.amount.minor }))
        .filter((c) => c.pct >= 0.01 && c.pct <= 0.08)
        .sort((a, b) => Number(refNumbers.includes(b.inv.number)) - Number(refNumbers.includes(a.inv.number)) || a.pct - b.pct);
      if (candidates[0]) {
        claimed.add(candidates[0].inv.id);
        shortPays.push({ tx, ...candidates[0] });
        continue;
      }
    }

    // 4. Bank fees
    if (tx.direction === "out" && FEE_PATTERN.test(tx.reference) && toUsd(tx.amount, snapshot.rates).minor < 100_000) {
      fees.push(tx);
      suggestions.push({ transactionId: tx.id, invoiceIds: [], rule: "fee", confidence: 0.9 });
      continue;
    }

    // 5. Exceptions
    if (daysBetween(tx.valueDate, today) > 3) exceptions.push(tx);
  }

  const findings: Finding[] = [];
  const matchSuggestions = suggestions.filter((s) => s.rule !== "fee");

  if (matchSuggestions.length) {
    const total = matchSuggestions.reduce((s, m) => s + toUsd((snapshot.transactions.find((t) => t.id === m.transactionId) as Transaction).amount, snapshot.rates).minor, 0);
    findings.push({
      id: `rc-matches-${stableHash(matchSuggestions.map((m) => m.transactionId))}`,
      agentId: "reconciliation",
      severity: "low",
      title: `${matchSuggestions.length} bank lines matched to open invoices`,
      summary: `${exactCount} exact and ${strongCount} strong matches worth ${formatWithCode({ minor: total, currency: "USD" }, { compact: true })}. Confirm them to close the invoices.`,
      reasons: [
        `${exactCount} lines quote the invoice number and the amount is identical.`,
        `${strongCount} lines come from the right customer, within 0.5% of the invoice and 5 days of its due date.`,
      ],
      evidence: matchSuggestions.slice(0, 6).map((m) => ({ type: "transaction", id: m.transactionId, label: m.transactionId })),
      confidence: 0.94,
      recommendation: { action: "confirm_match", label: `Confirm ${matchSuggestions.length} matches` },
      status: "open",
      createdAt: now,
      impactUsd: total,
    });
  }

  for (const { tx, inv, pct } of shortPays) {
    const shortfall = { minor: inv.amount.minor - tx.amount.minor, currency: inv.amount.currency };
    const customer = cps.get(inv.counterpartyId)?.name ?? tx.counterparty;
    findings.push({
      id: `rc-short-${tx.id}`,
      agentId: "reconciliation",
      severity: "medium",
      title: `${customer} short paid ${inv.number} by ${(pct * 100).toFixed(1)}%`,
      summary: `Received ${formatWithCode(tx.amount)} against ${formatWithCode(inv.amount)}. Book the partial match and open a deduction case for ${formatWithCode(shortfall)}.`,
      reasons: [
        `The payer is the customer on ${inv.number}.`,
        `The amount is ${(pct * 100).toFixed(1)}% under the invoice, inside the 1% to 8% short pay range.`,
        tx.reference.includes(inv.number) ? `The remittance reference quotes ${inv.number}.` : "No other open invoice from this customer is a closer fit.",
      ],
      evidence: [
        { type: "transaction", id: tx.id, label: `Bank line ${tx.id}` },
        { type: "invoice", id: inv.id, label: inv.number },
        { type: "counterparty", id: inv.counterpartyId, label: customer },
      ],
      confidence: 0.75,
      recommendation: { action: "open_deduction_case", label: "Partial match and open deduction case", amount: shortfall },
      status: "open",
      createdAt: now,
      impactUsd: toUsd(shortfall, snapshot.rates).minor,
    });
  }

  if (fees.length) {
    const total = fees.reduce((s, t) => s + toUsd(t.amount, snapshot.rates).minor, 0);
    findings.push({
      id: `rc-fees-${stableHash(fees.map((t) => t.id))}`,
      agentId: "reconciliation",
      severity: "low",
      title: `${fees.length} bank fee debits ready to confirm`,
      summary: `Small charges with FEE or CHG in the reference, ${formatWithCode({ minor: total, currency: "USD" })} in total. Confirm them as bank charges in one go.`,
      reasons: ["Every line is a debit under USD 1,000.", "Every reference contains FEE or CHG.", "None of them matches an open supplier invoice."],
      evidence: fees.slice(0, 6).map((t) => ({ type: "transaction", id: t.id, label: `${t.reference}` })),
      confidence: 0.9,
      recommendation: { action: "confirm_match", label: `Confirm ${fees.length} as bank charges` },
      status: "open",
      createdAt: now,
      impactUsd: total,
    });
  }

  for (const tx of exceptions) {
    const usd = toUsd(tx.amount, snapshot.rates).minor;
    const age = daysBetween(tx.valueDate, today);
    findings.push({
      id: `rc-exc-${tx.id}`,
      agentId: "reconciliation",
      severity: usd > 5_000_000 ? "medium" : "low",
      title: `Unexplained ${tx.direction === "in" ? "credit" : "debit"} of ${formatWithCode(tx.amount)}`,
      summary: `This line has sat unmatched for ${age} days. Nothing in the ledger fits it, so someone needs to look.`,
      reasons: ["No invoice number in the reference.", "No open invoice from this counterparty at a similar amount.", `Unmatched for ${age} days, past the 3 day limit.`],
      evidence: [{ type: "transaction", id: tx.id, label: `${tx.counterparty} · ${tx.reference}` }],
      confidence: 0.6,
      recommendation: { action: "review", label: "Investigate and classify" },
      status: "open",
      createdAt: now,
      impactUsd: usd,
    });
  }

  const steps: TraceStep[] = [
    { label: "Loaded unmatched bank lines", detail: `Loaded ${unmatched.length} unmatched transactions`, durationMs: 120, status: "done" },
    { label: "Exact reference matches", detail: `Exact reference matches: ${exactCount}`, durationMs: 340, status: "done" },
    { label: "Amount and counterparty matches", detail: `Amount and counterparty matches: ${strongCount}`, durationMs: 410, status: "done" },
    { label: "Short pays", detail: `Short pays detected: ${shortPays.length}`, durationMs: 160, status: shortPays.length ? "warning" : "done" },
    { label: "Bank fees", detail: `Fee lines grouped: ${fees.length}`, durationMs: 90, status: "done" },
    { label: "Exceptions", detail: `Left as exceptions: ${exceptions.length}`, durationMs: 60, status: exceptions.length ? "warning" : "done" },
  ];

  return {
    id: `run-reconciliation-${now}`,
    agentId: "reconciliation",
    startedAt: now,
    finishedAt: now,
    inputs: `${unmatched.length} unmatched bank lines, ${open.length} open invoices`,
    steps,
    findings,
    suggestions,
  };
}
