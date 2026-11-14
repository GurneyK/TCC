import { SEVERITY_RANK, type Finding } from "@/agents/types";
import type { Payment, Role } from "@/data/types";

export interface Actor {
  name: string;
  role: Role;
}

/** Findings that point at this payment, from any agent. */
export function linkedFindings(payment: Payment, findings: Finding[]): Finding[] {
  return findings.filter(
    (f) => f.id === `pr-${payment.id}` || payment.linkedFindingIds.includes(f.id) || f.evidence.some((e) => e.type === "payment" && e.id === payment.id),
  );
}

/** Open high or critical findings stop an approval until someone resolves them. */
export function blockingFindings(payment: Payment, findings: Finding[]): Finding[] {
  return linkedFindings(payment, findings).filter((f) => f.status === "open" && SEVERITY_RANK[f.severity] >= SEVERITY_RANK.high);
}

/**
 * Why this person cannot approve this payment, or null when they can.
 * The UI shows the reason next to a disabled button, and the store checks again before acting.
 */
export function approvalBlock(payment: Payment, actor: Actor, findings: Finding[]): string | null {
  if (actor.role !== "treasurer") return "Only the Group Treasurer can approve payments.";
  if (payment.status !== "pending_approval") return "This payment is not waiting for approval.";
  if (payment.createdBy === actor.name) return "You created this payment, so a second person has to approve it.";
  const blocking = blockingFindings(payment, findings);
  if (blocking.length) {
    const top = [...blocking].sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])[0];
    return `Open ${top.severity} finding: ${top.title}. Resolve it in Exceptions first.`;
  }
  return null;
}

export function rejectBlock(payment: Payment, actor: Actor): string | null {
  if (actor.role !== "treasurer") return "Only the Group Treasurer can reject payments.";
  if (payment.status !== "pending_approval") return "This payment is not waiting for approval.";
  return null;
}

export function submitBlock(payment: Payment, actor: Actor): string | null {
  if (actor.role === "auditor") return "Auditors have read only access.";
  if (payment.status !== "draft") return "Only drafts can be submitted.";
  return null;
}

export function releaseBlock(payments: Payment[], actor: Actor): string | null {
  if (actor.role !== "treasurer") return "Only the Group Treasurer can release payments to the bank.";
  if (!payments.some((p) => p.status === "approved")) return "No approved payments are waiting for release.";
  return null;
}

/** Analysts and treasurers can act on findings. Auditors only read. */
export function canActOnFindings(role: Role) {
  return role !== "auditor";
}
