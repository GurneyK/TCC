import type { DataSource, FxRate, Invoice, Transaction, TreasuryData } from "@/data/types";
import { createRng } from "@/data/rng";
import { CSV_INVOICES, SCENARIOS } from "@/data/scenarios";
import { isoDate } from "@/lib/dates";

/** Cadence in simulated seconds. */
export const LIVE_CADENCE = { transactions: 4, rates: 15, reconciliation: 30 } as const;
export const LIVE_SEED_OFFSET = 0x5eed;

const RESERVED = new Set<string>([SCENARIOS.S4.invoiceNumber, ...CSV_INVOICES.map((i) => i.number)]);
const FEE_REFS = ["SERVICE CHG", "WIRE FEE", "PAYMENT CHG"];

export interface LiveTxResult {
  transactions: Transaction[];
  rngState: number;
}

/**
 * Pushes 1 to 3 bank lines. Most settle an open receivable exactly so the
 * Reconciliation agent has steady, easy work. A few are small bank charges.
 * Feeds that are down (stale sources) send nothing.
 */
export function makeLiveTransactions(
  data: TreasuryData,
  rngState: number,
  now: string,
  seq: number,
  opts: { frozenSourceIds: Set<string>; claimedInvoiceIds: Set<string> },
): LiveTxResult {
  const rng = createRng(rngState);
  const liveAccounts = data.accounts.filter((a) => !opts.frozenSourceIds.has(a.sourceId) && a.type !== "payroll");
  const candidates: Invoice[] = data.invoices.filter(
    (i) => i.kind === "AR" && i.status === "open" && !RESERVED.has(i.number) && !opts.claimedInvoiceIds.has(i.id),
  );
  const count = rng.int(1, 3);
  const out: Transaction[] = [];
  const cpName = new Map(data.counterparties.map((c) => [c.id, c.name]));

  for (let n = 0; n < count; n += 1) {
    const id = `tx-live-${String(seq + n).padStart(4, "0")}`;
    if (rng.chance(0.12) && liveAccounts.length) {
      const account = rng.pick(liveAccounts);
      out.push({
        id,
        accountId: account.id,
        valueDate: isoDate(now),
        bookedAt: now,
        amount: { minor: rng.int(800, 9_500), currency: account.currency },
        direction: "out",
        counterparty: data.banks.find((b) => b.id === account.bankId)?.name ?? "Bank",
        reference: rng.pick(FEE_REFS),
        status: "unmatched",
      });
      continue;
    }
    // Find an invoice whose entity has a live account in the invoice currency.
    for (let attempt = 0; attempt < 8 && candidates.length; attempt += 1) {
      const idx = rng.int(0, candidates.length - 1);
      const inv = candidates[idx];
      const account = liveAccounts.find((a) => a.entityId === inv.entityId && a.currency === inv.amount.currency && a.type === "collections")
        ?? liveAccounts.find((a) => a.entityId === inv.entityId && a.currency === inv.amount.currency);
      if (!account) continue;
      candidates.splice(idx, 1);
      opts.claimedInvoiceIds.add(inv.id);
      out.push({
        id,
        accountId: account.id,
        valueDate: isoDate(now),
        bookedAt: now,
        amount: { ...inv.amount },
        direction: "in",
        counterparty: cpName.get(inv.counterpartyId) ?? "Customer",
        reference: rng.chance(0.5) ? `${inv.number} PAYMENT` : `REMIT ${inv.number}`,
        status: "unmatched",
      });
      break;
    }
  }
  return { transactions: out, rngState: rng.getState() };
}

/** Nudges every rate by up to 0.1%. */
export function nudgeRates(rates: FxRate[], rngState: number, now: string): { rates: FxRate[]; rngState: number } {
  const rng = createRng(rngState);
  const next = rates.map((r) => (r.pair === "USD/USD" ? r : { ...r, rate: Number((r.rate * (1 + rng.between(-0.001, 0.001))).toPrecision(6)), updatedAt: now }));
  return { rates: next, rngState: rng.getState() };
}

/** Every feed that is up syncs on each tick. Frozen feeds keep their old timestamp. */
export function touchSources(sources: DataSource[], now: string, frozen: Set<string>, newLinesBySource: Map<string, number>): DataSource[] {
  return sources.map((s) =>
    frozen.has(s.id) || s.type === "file_upload"
      ? s
      : { ...s, lastSyncAt: now, status: "healthy", recordsToday: s.recordsToday + (newLinesBySource.get(s.id) ?? 0) },
  );
}
