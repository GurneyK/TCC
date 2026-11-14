import { AGENT_META } from "@/agents/types";
import type { AuditActor, FxRate, Money, TreasuryData } from "@/data/types";
import { formatWithCode, toUsd } from "@/lib/money";

export function actorName(a: AuditActor) {
  if (a.type === "user") return a.name;
  if (a.type === "agent") return AGENT_META[a.agentId].name;
  return "System";
}

export function usd(m: Money, rates: FxRate[], compact = true) {
  return formatWithCode(toUsd(m, rates), { compact });
}

export function counterpartyName(data: TreasuryData, id: string) {
  return data.counterparties.find((c) => c.id === id)?.name ?? data.entities.find((e) => e.id === id)?.name ?? id;
}

export function entityName(data: TreasuryData, id: string) {
  return data.entities.find((e) => e.id === id)?.name ?? id;
}

export function bankName(data: TreasuryData, id: string) {
  return data.banks.find((b) => b.id === id)?.name ?? id;
}

export function shortEntity(name: string) {
  return name.replace("Lumen Brands ", "").replace("Lumen ", "");
}

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  released: "Released",
  acknowledged: "Acknowledged",
};
