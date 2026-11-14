import { forwardQuote } from "@/agents/fxExposure";
import type { Finding } from "@/agents/types";
import type { HedgeRequest, Payment, TreasuryData } from "@/data/types";
import { PERSONAS, TREASURY_CENTRE_ID } from "@/data/world";
import { canActOnFindings } from "@/lib/approvals";
import { addDays, isoDate } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { commit, findingEvent, resolveFinding } from "./commit";
import { runForFinding, snapshotOf, userActor, type NewAuditEvent } from "./engine";
import type { Actions, Getter, Setter, TreasuryState } from "./state";

type Result = { ok: boolean; message: string; paymentId?: string };

function actionable(s: TreasuryState, id: string): Finding | string {
  if (!canActOnFindings(s.role)) return "Auditors have read only access.";
  const f = s.findings.find((x) => x.id === id);
  if (!f) return "That finding no longer exists.";
  if (f.status !== "open" && f.status !== "escalated") return "This finding is already resolved.";
  return f;
}

export function paymentIdOf(f: Finding): string | undefined {
  return f.id.startsWith("pr-") ? f.id.slice(3) : undefined;
}

function rejectPaymentData(data: TreasuryData, paymentId: string, reason: string): TreasuryData {
  return { ...data, payments: data.payments.map((p) => (p.id === paymentId ? { ...p, status: "rejected", rejectedReason: reason } : p)) };
}

function paymentLabel(data: TreasuryData, p: Payment) {
  const to = data.counterparties.find((c) => c.id === p.counterpartyId)?.name ?? data.entities.find((e) => e.id === p.counterpartyId)?.name ?? p.counterpartyId;
  return `${formatWithCode(p.amount)} to ${to}`;
}

function confirmMatches(s: TreasuryState, f: Finding): { data: TreasuryData; count: number } {
  const run = runForFinding(s.runs, f.id);
  const fees = f.id.startsWith("rc-fees");
  const picks = (run?.suggestions ?? []).filter((m) => (fees ? m.rule === "fee" : m.rule !== "fee"));
  const byTx = new Map(picks.map((m) => [m.transactionId, m.invoiceIds]));
  const paid = new Set(picks.flatMap((m) => m.invoiceIds));
  const data: TreasuryData = {
    ...s.data,
    transactions: s.data.transactions.map((t) => (byTx.has(t.id) ? { ...t, status: "matched", matchedInvoiceIds: byTx.get(t.id) } : t)),
    invoices: s.data.invoices.map((i) => (paid.has(i.id) ? { ...i, status: "paid" } : i)),
  };
  return { data, count: picks.length };
}

export function findingActions(set: Setter, get: Getter): Pick<Actions, "acceptFinding" | "dismissFinding" | "escalateFinding" | "verifyCallback"> {
  return {
    acceptFinding(id) {
      const s = get();
      const found = actionable(s, id);
      if (typeof found === "string") return { ok: false, message: found };
      const f = found;
      const action = f.recommendation.action;
      const events: NewAuditEvent[] = [findingEvent(s, f, "Accepted recommendation", { recommendation: f.recommendation.label })];
      const resolved = resolveFinding(s, f, "accepted", f.recommendation.label);
      let result: Result = { ok: true, message: "Recommendation accepted." };

      if (action === "verify_callback") return { ok: false, message: "Record the callback result first." };

      if (action === "confirm_match") {
        const { data, count } = confirmMatches(s, f);
        events.push({ at: s.now, actor: userActor(s.role), action: "Confirmed matches", target: { type: "finding", id: f.id, label: f.title }, details: { lines: count } });
        commit(get, set, { data, resolved, events, rerun: ["reconciliation"] });
        return { ok: true, message: `${count} bank lines confirmed.` };
      }

      if (action === "open_deduction_case") {
        const txId = f.evidence.find((e) => e.type === "transaction")?.id;
        const invId = f.evidence.find((e) => e.type === "invoice")?.id;
        const caseId = `DC-${(txId ?? f.id).replace(/\D/g, "").slice(-4).padStart(4, "0")}`;
        const data: TreasuryData = {
          ...s.data,
          transactions: s.data.transactions.map((t) => (t.id === txId ? { ...t, status: "matched", matchedInvoiceIds: invId ? [invId] : [] } : t)),
          invoices: s.data.invoices.map((i) => (i.id === invId ? { ...i, status: "partially_paid" } : i)),
        };
        events.push({
          at: s.now,
          actor: userActor(s.role),
          action: "Opened deduction case",
          target: { type: "invoice", id: invId ?? "", label: f.evidence.find((e) => e.type === "invoice")?.label ?? "" },
          details: { case: caseId, shortfall: f.recommendation.amount ? formatWithCode(f.recommendation.amount) : "" },
        });
        commit(get, set, { data, resolved, events, rerun: ["reconciliation"] });
        return { ok: true, message: `Partial match booked. Deduction case ${caseId} opened.` };
      }

      if (action === "fund_entity" && f.recommendation.amount) {
        const entityId = f.evidence.find((e) => e.type === "entity")?.id ?? "";
        const week = Number(/-w(\d+)$/.exec(f.id)?.[1] ?? 2);
        const from = s.data.accounts.find((a) => a.entityId === TREASURY_CENTRE_ID) ?? s.data.accounts[0];
        const payment: Payment = {
          id: `pay-fund-${entityId.replace("ent-", "")}-${s.seq + 1}`,
          entityId: TREASURY_CENTRE_ID,
          fromAccountId: from.id,
          counterpartyId: entityId,
          toEntityId: entityId,
          invoiceIds: [],
          amount: f.recommendation.amount,
          valueDate: addDays(isoDate(s.now), Math.max(1, (week - 1) * 7 - 3)),
          kind: "intercompany",
          status: "draft",
          createdBy: PERSONAS[s.role].name,
          createdAt: s.now,
          linkedFindingIds: [f.id],
        };
        const data = { ...s.data, payments: [...s.data.payments, payment] };
        events.push({ at: s.now, actor: userActor(s.role), action: "Created draft funding payment", target: { type: "payment", id: payment.id, label: paymentLabel(data, payment) }, details: { from: "Lumen Treasury Centre", valueDate: payment.valueDate } });
        commit(get, set, { data, resolved, events });
        return { ok: true, message: `Draft payment ${payment.id} created. Submit it for approval in Payments.`, paymentId: payment.id };
      }

      if (action === "book_hedge" && f.recommendation.amount) {
        const amount = f.recommendation.amount;
        const quote = forwardQuote(amount.currency, amount.minor, snapshotOf(s.data, s.now));
        const request: HedgeRequest = { id: `hr-${String(s.hedgeRequests.length + 1).padStart(3, "0")}`, currency: amount.currency, notional: amount, indicativeRate: quote.indicativeRate, createdBy: PERSONAS[s.role].name, createdAt: s.now, findingId: f.id };
        events.push({ at: s.now, actor: userActor(s.role), action: "Requested forward hedge", target: { type: "hedge_request", id: request.id, label: `${formatWithCode(amount, { compact: true })} forward` }, details: { indicativeRate: quote.indicativeRate } });
        commit(get, set, { hedgeRequests: [...s.hedgeRequests, request], resolved, events });
        return { ok: true, message: `Hedge request ${request.id} sent to the treasurer.` };
      }

      if (action === "hold_payment") {
        const pid = paymentIdOf(f);
        if (pid) {
          const data = rejectPaymentData(s.data, pid, `Held: ${f.recommendation.label}`);
          const p = data.payments.find((x) => x.id === pid);
          events.push({ at: s.now, actor: userActor(s.role), action: "Held payment", target: { type: "payment", id: pid, label: p ? paymentLabel(data, p) : pid }, details: { reason: f.recommendation.label } });
          commit(get, set, { data, resolved, events, rerun: ["payment_risk", "cash_forecast"] });
          return { ok: true, message: "Payment held and taken out of the approval queue." };
        }
      }

      // review and anything else: record the decision, park exceptions for follow up.
      const txId = f.id.startsWith("rc-exc-") ? f.id.slice(7) : undefined;
      const data = txId ? { ...s.data, transactions: s.data.transactions.map((t) => (t.id === txId ? { ...t, status: "exception" as const } : t)) } : s.data;
      commit(get, set, { data, resolved, events, rerun: txId ? ["reconciliation"] : [] });
      result = { ok: true, message: "Marked as reviewed." };
      return result;
    },

    dismissFinding(id, reason) {
      const s = get();
      const f = actionable(s, id);
      if (typeof f === "string" || !reason.trim()) return;
      commit(get, set, { resolved: resolveFinding(s, f, "dismissed", reason.trim()), events: [findingEvent(s, f, "Dismissed finding", { reason: reason.trim() })] });
    },

    escalateFinding(id, note) {
      const s = get();
      const f = actionable(s, id);
      if (typeof f === "string") return;
      const text = `Assigned to ${PERSONAS.treasurer.name}.${note.trim() ? ` ${note.trim()}` : ""}`;
      commit(get, set, { resolved: resolveFinding(s, f, "escalated", text), events: [findingEvent(s, f, "Escalated finding", { assignee: PERSONAS.treasurer.name, note: note.trim() })] });
    },

    verifyCallback(id, confirmed, note) {
      const s = get();
      const f = actionable(s, id);
      if (typeof f === "string") return;
      const pid = paymentIdOf(f);
      const outcome = confirmed ? "Callback confirmed the new bank details." : "Callback did not confirm the new bank details.";
      const text = note.trim() ? `${outcome} ${note.trim()}` : outcome;
      const events: NewAuditEvent[] = [findingEvent(s, f, `Recorded callback: ${confirmed ? "confirmed" : "not confirmed"}`, { note: note.trim() })];
      let data = s.data;
      if (!confirmed && pid) {
        data = rejectPaymentData(s.data, pid, "Callback not confirmed. The bank detail change could not be verified.");
        const p = data.payments.find((x) => x.id === pid);
        events.push({ at: s.now, actor: { type: "system" }, action: "Auto rejected payment", target: { type: "payment", id: pid, label: p ? paymentLabel(data, p) : pid }, details: { rule: "Callback not confirmed" } });
      }
      commit(get, set, { data, resolved: resolveFinding(s, f, "accepted", text), events, rerun: ["payment_risk", "cash_forecast"] });
    },
  };
}

export { paymentLabel };
