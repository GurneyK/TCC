import type { BankAccount, Transaction } from "@/data/types";
import { daysBetween } from "./dates";

export interface CounterpartyHistory {
  count: number;
  medianMinor: number;
  entityIds: Set<string>;
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/** Outgoing payments to each counterparty over the last 6 months, from bank transactions. */
export function buildPaymentHistory(
  transactions: Transaction[],
  accounts: BankAccount[],
  today: string,
): Map<string, CounterpartyHistory> {
  const entityOf = new Map(accounts.map((a) => [a.id, a.entityId]));
  const amounts = new Map<string, number[]>();
  const entities = new Map<string, Set<string>>();

  for (const tx of transactions) {
    if (tx.direction !== "out" || tx.status !== "matched") continue;
    if (daysBetween(tx.valueDate, today) > 182) continue;
    const list = amounts.get(tx.counterparty) ?? [];
    list.push(tx.amount.minor);
    amounts.set(tx.counterparty, list);
    const set = entities.get(tx.counterparty) ?? new Set<string>();
    const entityId = entityOf.get(tx.accountId);
    if (entityId) set.add(entityId);
    entities.set(tx.counterparty, set);
  }

  const out = new Map<string, CounterpartyHistory>();
  for (const [name, list] of amounts) {
    out.set(name, { count: list.length, medianMinor: median(list), entityIds: entities.get(name) ?? new Set() });
  }
  return out;
}
