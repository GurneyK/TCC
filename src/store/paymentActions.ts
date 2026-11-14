import type { BankAccount, DataSource, Payment, TreasuryData } from "@/data/types";
import { approvalBlock, rejectBlock, releaseBlock, submitBlock } from "@/lib/approvals";
import { rowsToTransactions } from "@/lib/csv";
import { addDays, isoDate } from "@/lib/dates";
import { formatWithCode, fromUsd, toUsd } from "@/lib/money";
import { actorOf, commit } from "./commit";
import { userActor, type NewAuditEvent } from "./engine";
import { paymentLabel } from "./findingActions";
import type { Actions, Getter, Setter } from "./state";

export const ACK_DELAY_MS = 3000;

function setStatus(data: TreasuryData, ids: Set<string>, patch: Partial<Payment>): TreasuryData {
  return { ...data, payments: data.payments.map((p) => (ids.has(p.id) ? { ...p, ...patch } : p)) };
}

function inCurrency(minorAmount: Payment["amount"], account: BankAccount, data: TreasuryData) {
  return minorAmount.currency === account.currency ? minorAmount.minor : fromUsd(toUsd(minorAmount, data.rates), account.currency, data.rates).minor;
}

/** Posts an acknowledged payment to bank balances. Intercompany also credits the receiving entity. */
export function postToBalances(data: TreasuryData, p: Payment): TreasuryData {
  const receiving = p.toEntityId
    ? data.accounts.find((a) => a.entityId === p.toEntityId && a.type === "operating" && a.currency === p.amount.currency) ??
      data.accounts.find((a) => a.entityId === p.toEntityId && a.type === "operating")
    : undefined;
  const accounts = data.accounts.map((a) => {
    let delta = 0;
    if (a.id === p.fromAccountId) delta -= inCurrency(p.amount, a, data);
    if (receiving && a.id === receiving.id) delta += inCurrency(p.amount, a, data);
    if (!delta) return a;
    return { ...a, balance: { ...a.balance, minor: a.balance.minor + delta }, availableBalance: { ...a.availableBalance, minor: a.availableBalance.minor + delta } };
  });
  return { ...data, accounts };
}

type Picked = Pick<Actions, "submitPayment" | "approvePayment" | "rejectPayment" | "releaseApproved" | "bookHedge" | "retrySync" | "importStatement">;

export function paymentActions(set: Setter, get: Getter): Picked {
  const paymentEvent = (action: string, p: Payment, details?: NewAuditEvent["details"]): NewAuditEvent => {
    const s = get();
    return { at: s.now, actor: userActor(s.role), action, target: { type: "payment", id: p.id, label: paymentLabel(s.data, p) }, details };
  };

  return {
    submitPayment(id) {
      const s = get();
      const p = s.data.payments.find((x) => x.id === id);
      if (!p) return { ok: false, message: "Payment not found." };
      const block = submitBlock(p, actorOf(s));
      if (block) return { ok: false, message: block };
      const data = setStatus(s.data, new Set([id]), { status: "pending_approval", createdAt: s.now, createdBy: actorOf(s).name });
      commit(get, set, { data, events: [paymentEvent("Submitted payment for approval", p)], rerun: ["payment_risk", "cash_forecast"] });
      return { ok: true, message: "Submitted. A treasurer now needs to approve it." };
    },

    approvePayment(id, comment) {
      const s = get();
      const p = s.data.payments.find((x) => x.id === id);
      if (!p) return { ok: false, message: "Payment not found." };
      const block = approvalBlock(p, actorOf(s), s.findings);
      if (block) return { ok: false, message: block };
      const data = setStatus(s.data, new Set([id]), { status: "approved", approvedBy: actorOf(s).name });
      commit(get, set, { data, events: [paymentEvent("Approved payment", p, { comment: comment.trim() || "No comment" })], rerun: ["payment_risk", "cash_forecast"] });
      return { ok: true, message: "Approved. Release it to the bank when ready." };
    },

    rejectPayment(id, comment) {
      const s = get();
      const p = s.data.payments.find((x) => x.id === id);
      if (!p) return { ok: false, message: "Payment not found." };
      const block = rejectBlock(p, actorOf(s));
      if (block) return { ok: false, message: block };
      if (!comment.trim()) return { ok: false, message: "Add a reason for the rejection." };
      const data = setStatus(s.data, new Set([id]), { status: "rejected", rejectedReason: comment.trim() });
      commit(get, set, { data, events: [paymentEvent("Rejected payment", p, { reason: comment.trim() })], rerun: ["payment_risk", "cash_forecast"] });
      return { ok: true, message: "Rejected." };
    },

    releaseApproved() {
      const s = get();
      const block = releaseBlock(s.data.payments, actorOf(s));
      if (block) return { ok: false, message: block };
      const batch = s.data.payments.filter((p) => p.status === "approved");
      const ids = new Set(batch.map((p) => p.id));
      const total = batch.reduce((sum, p) => sum + toUsd(p.amount, s.data.rates).minor, 0);
      const batchId = `BATCH-${String(s.seq + 1).padStart(5, "0")}`;
      const events = batch.map((p) => paymentEvent("Released payment to bank", p, { batch: batchId }));
      commit(get, set, { data: setStatus(s.data, ids, { status: "released" }), events });

      setTimeout(() => {
        const now = get();
        let data = now.data;
        const acked = data.payments.filter((p) => ids.has(p.id) && p.status === "released");
        if (!acked.length) return;
        for (const p of acked) data = postToBalances(data, p);
        data = setStatus(data, new Set(acked.map((p) => p.id)), { status: "acknowledged" });
        const ackEvents: NewAuditEvent[] = acked.map((p) => ({
          at: now.now,
          actor: { type: "system" },
          action: "Bank acknowledged payment",
          target: { type: "payment", id: p.id, label: paymentLabel(now.data, p) },
          details: { batch: batchId, message: "pain.002 ACSC" },
        }));
        commit(get, set, { data, events: ackEvents, rerun: ["cash_forecast"] });
      }, ACK_DELAY_MS);

      return { ok: true, message: `Released ${batch.length} payment${batch.length === 1 ? "" : "s"} worth ${formatWithCode({ minor: total, currency: "USD" }, { compact: true })}. Waiting for the bank.` };
    },

    bookHedge(requestId) {
      const s = get();
      if (s.role !== "treasurer") return { ok: false, message: "Only the Group Treasurer can book hedges." };
      const r = s.hedgeRequests.find((h) => h.id === requestId);
      if (!r || r.bookedHedgeId) return { ok: false, message: "This request is already booked." };
      if (r.createdBy === actorOf(s).name) return { ok: false, message: "You raised this request, so a second person has to book it." };
      const hedge = { id: `hdg-${String(s.data.hedges.length + 1).padStart(3, "0")}`, currency: r.currency, notional: r.notional, rate: r.indicativeRate, tradeDate: isoDate(s.now), maturityDate: addDays(isoDate(s.now), 75), bankId: "bank-harborline" };
      commit(get, set, {
        data: { ...s.data, hedges: [...s.data.hedges, hedge] },
        hedgeRequests: s.hedgeRequests.map((h) => (h.id === r.id ? { ...h, bookedHedgeId: hedge.id } : h)),
        events: [{ at: s.now, actor: userActor(s.role), action: "Booked forward hedge", target: { type: "hedge", id: hedge.id, label: `${formatWithCode(r.notional, { compact: true })} forward` }, details: { rate: r.indicativeRate, request: r.id } }],
        rerun: ["fx_exposure", "cash_forecast"],
      });
      return { ok: true, message: `Forward ${hedge.id} booked with Harborline Bank.` };
    },

    retrySync(sourceId) {
      const s = get();
      if (s.role === "auditor") return;
      const src = s.data.sources.find((x) => x.id === sourceId);
      if (!src) return;
      const sources = s.data.sources.map((x) => (x.id === sourceId ? { ...x, lastSyncAt: s.now, status: "healthy" as const, recordsToday: x.recordsToday + 42 } : x));
      commit(get, set, {
        data: { ...s.data, sources },
        events: [
          { at: s.now, actor: userActor(s.role), action: "Retried source sync", target: { type: "source", id: src.id, label: src.name } },
          { at: s.now, actor: { type: "system" }, action: "Source back in sync", target: { type: "source", id: src.id, label: src.name }, details: { records: 42 } },
        ],
      });
    },

    importStatement(rows, fileName) {
      const s = get();
      const n = s.importCount + 1;
      const scope = `import-${n}`;
      const txs = rowsToTransactions(rows, `csv${n}`, s.now);
      const upload: DataSource = { id: "src-upload", name: "Statement upload", type: "file_upload", format: "CSV", status: "healthy", lastSyncAt: s.now, slaMinutes: 60 * 24 * 365, recordsToday: txs.length };
      const existing = s.data.sources.find((x) => x.id === upload.id);
      const sources = existing
        ? s.data.sources.map((x) => (x.id === upload.id ? { ...x, lastSyncAt: s.now, recordsToday: x.recordsToday + txs.length } : x))
        : [...s.data.sources, upload];
      commit(get, set, {
        data: { ...s.data, transactions: [...s.data.transactions, ...txs], sources },
        scopedTxIds: { ...s.scopedTxIds, [scope]: txs.map((t) => t.id) },
        importCount: n,
        events: [{ at: s.now, actor: userActor(s.role), action: "Imported bank statement", target: { type: "source", id: upload.id, label: fileName }, details: { rows: rows.length, imported: txs.length } }],
        rerun: ["reconciliation"],
      });
      const run = get().runs[`recon:${scope}`];
      const matched = run?.suggestions?.filter((m) => m.rule !== "fee").length ?? 0;
      const fees = run?.suggestions?.filter((m) => m.rule === "fee").length ?? 0;
      const shortPays = run?.findings.filter((f) => f.id.startsWith("rc-short")).length ?? 0;
      const exceptions = run?.findings.filter((f) => f.id.startsWith("rc-exc")).length ?? 0;
      return { batchId: scope, imported: txs.length, matched, fees, shortPays, exceptions, unmatched: txs.length - matched - fees - shortPays - exceptions };
    },
  };
}
