import { runCashForecast } from "@/agents/cashForecast";
import { runFxExposure } from "@/agents/fxExposure";
import { runPaymentRisk } from "@/agents/paymentRisk";
import { runReconciliation } from "@/agents/reconciliation";
import { AGENT_META, SEVERITY_RANK, type AgentId, type AgentRun, type Finding } from "@/agents/types";
import type { AuditActor, AuditEvent, Role, TreasuryData, TreasurySnapshot } from "@/data/types";
import { PERSONAS } from "@/data/world";
import { addMinutes } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";

/** Agent runs keyed by agent id, plus scoped reconciliation runs as `recon:<scope>`. */
export type Runs = Record<string, AgentRun>;

export function snapshotOf(data: TreasuryData, now: string): TreasurySnapshot {
  return { ...data, now };
}

export function userActor(role: Role): AuditActor {
  return { type: "user", name: PERSONAS[role].name, role };
}

/** Full reconciliation skips lines owned by a scope (live feed, uploads). Each scope runs on its own lines. */
export function runReconciliationAll(data: TreasuryData, now: string, scoped: Record<string, string[]>): Runs {
  const snap = snapshotOf(data, now);
  const owned = new Set(Object.values(scoped).flat());
  const fullIds = data.transactions.filter((t) => t.status === "unmatched" && !owned.has(t.id)).map((t) => t.id);
  const runs: Runs = { reconciliation: runReconciliation(snap, now, { transactionIds: fullIds }) };
  for (const [scope, ids] of Object.entries(scoped)) {
    if (ids.length) runs[`recon:${scope}`] = runReconciliation(snap, now, { transactionIds: ids });
  }
  return runs;
}

export function runAgents(ids: AgentId[], data: TreasuryData, now: string, scoped: Record<string, string[]>, prev: Runs = {}): Runs {
  const snap = snapshotOf(data, now);
  let next: Runs = { ...prev };
  for (const id of ids) {
    if (id === "reconciliation") {
      next = Object.fromEntries(Object.entries(next).filter(([k]) => !k.startsWith("recon:") && k !== "reconciliation"));
      Object.assign(next, runReconciliationAll(data, now, scoped));
    } else if (id === "payment_risk") next.payment_risk = runPaymentRisk(snap, now);
    else if (id === "cash_forecast") next.cash_forecast = runCashForecast(snap, now);
    else next.fx_exposure = runFxExposure(snap, now);
  }
  return next;
}

export const ALL_AGENTS: AgentId[] = ["reconciliation", "payment_risk", "cash_forecast", "fx_exposure"];

export function rankFindings(a: Finding, b: Finding) {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || (b.impactUsd ?? 0) - (a.impactUsd ?? 0) || a.id.localeCompare(b.id);
}

/** Current findings from every run. A finding someone acted on keeps its resolved version, even after the agent stops raising it. */
export function composeFindings(runs: Runs, resolved: Record<string, Finding>): Finding[] {
  const map = new Map<string, Finding>();
  for (const run of Object.values(runs)) for (const f of run.findings) map.set(f.id, resolved[f.id] ?? f);
  for (const f of Object.values(resolved)) map.set(f.id, f);
  return [...map.values()].sort(rankFindings);
}

/** The run that produced a finding, so actions can read its match suggestions. */
export function runForFinding(runs: Runs, findingId: string): AgentRun | undefined {
  return Object.values(runs).find((r) => r.findings.some((f) => f.id === findingId));
}

export type NewAuditEvent = Omit<AuditEvent, "id">;

export function withIds(events: NewAuditEvent[], seq: number): { events: AuditEvent[]; seq: number } {
  let n = seq;
  const out = events.map((e) => {
    n += 1;
    return { ...e, id: `ev-${String(n).padStart(5, "0")}` };
  });
  return { events: out, seq: n };
}

export function flaggedEvent(f: Finding, at: string): NewAuditEvent {
  return {
    at,
    actor: { type: "agent", agentId: f.agentId },
    action: "Raised finding",
    target: { type: "finding", id: f.id, label: f.title },
    details: { severity: f.severity, confidence: Math.round(f.confidence * 100) },
  };
}

/** A believable overnight trail so the audit log and every timeline have history on first load. */
export function initialAudit(data: TreasuryData, runs: Runs, now: string): NewAuditEvent[] {
  const events: NewAuditEvent[] = [];
  const nightly = addMinutes(now, -7 * 60);

  for (const s of data.sources) {
    const late = Date.parse(now) - Date.parse(s.lastSyncAt) > s.slaMinutes * 60_000;
    if (late) {
      events.push({
        at: addMinutes(s.lastSyncAt, s.slaMinutes),
        actor: { type: "system" },
        action: "Source missed its sync window",
        target: { type: "source", id: s.id, label: s.name },
        details: { slaMinutes: s.slaMinutes },
      });
    }
  }

  const cps = new Map(data.counterparties.map((c) => [c.id, c.name]));
  for (const p of data.payments) {
    const role: Role = p.createdBy === PERSONAS.treasurer.name ? "treasurer" : "analyst";
    const label = `${formatWithCode(p.amount)} to ${cps.get(p.counterpartyId) ?? p.counterpartyId}`;
    events.push({ at: p.createdAt, actor: userActor(role), action: "Submitted payment for approval", target: { type: "payment", id: p.id, label } });
    if (p.approvedBy) {
      events.push({ at: addMinutes(p.createdAt, 45), actor: userActor("treasurer"), action: "Approved payment", target: { type: "payment", id: p.id, label }, details: { comment: "Matches the approved invoice." } });
    }
  }

  let offset = 0;
  for (const run of Object.values(runs)) {
    if (!run.steps.length) continue;
    const at = addMinutes(nightly, offset);
    offset += 2;
    events.push({
      at,
      actor: { type: "agent", agentId: run.agentId },
      action: "Completed run",
      target: { type: "agent", id: run.agentId, label: AGENT_META[run.agentId].name },
      details: { findings: run.findings.length, inputs: run.inputs },
    });
    for (const f of run.findings) if (SEVERITY_RANK[f.severity] >= SEVERITY_RANK.high) events.push(flaggedEvent(f, addMinutes(at, 1)));
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}
