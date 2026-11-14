import type { BankAccount, DataSource } from "@/data/types";
import { minutesBetween } from "./dates";

/** A source is delayed once it misses its SLA. Failed and paused stay as they are. */
export function sourceStatus(source: DataSource, now: string): DataSource["status"] {
  if (source.status === "failed" || source.status === "paused") return source.status;
  return minutesBetween(source.lastSyncAt, now) > source.slaMinutes ? "delayed" : "healthy";
}

export function staleSourceIds(sources: DataSource[], now: string): Set<string> {
  return new Set(sources.filter((s) => sourceStatus(s, now) !== "healthy").map((s) => s.id));
}

export function isAccountStale(account: BankAccount, stale: Set<string>) {
  return stale.has(account.sourceId);
}
