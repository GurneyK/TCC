import { SEVERITY_RANK, type Finding } from "@/agents/types";
import { PERSONAS } from "@/data/world";
import { composeFindings, flaggedEvent, runAgents, userActor, withIds, type NewAuditEvent } from "./engine";
import type { Commit, Getter, Setter, TreasuryState } from "./state";

const AUDIT_CAP = 3000;
let announceSeq = 0;

/**
 * The one way state changes. Applies data, reruns the named agents, recomposes
 * findings, writes audit events and announces new high or critical findings.
 */
export function commit(get: Getter, set: Setter, c: Commit) {
  const s = get();
  const data = c.data ?? s.data;
  const scopedTxIds = c.scopedTxIds ?? s.scopedTxIds;
  const resolved = c.resolved ?? s.resolved;
  const runs = c.rerun?.length ? runAgents(c.rerun, data, s.now, scopedTxIds, s.runs) : s.runs;
  const findings = composeFindings(runs, resolved);

  const seen = new Set(s.seenFindingIds);
  const fresh = findings.filter((f) => !seen.has(f.id));
  fresh.forEach((f) => seen.add(f.id));
  const loud = fresh.filter((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK.high);
  const pending: NewAuditEvent[] = [...(c.events ?? []), ...loud.map((f) => flaggedEvent(f, s.now))];
  const { events, seq } = withIds(pending, s.seq);

  set({
    data,
    scopedTxIds,
    resolved,
    runs,
    findings,
    hedgeRequests: c.hedgeRequests ?? s.hedgeRequests,
    importCount: c.importCount ?? s.importCount,
    audit: [...s.audit, ...events].slice(-AUDIT_CAP),
    seq,
    seenFindingIds: [...seen],
    announcement: loud.length
      ? { id: (announceSeq += 1), text: `New ${loud[0].severity} finding: ${loud[0].title}` }
      : s.announcement,
  });
}

export function actorOf(s: TreasuryState) {
  return { name: PERSONAS[s.role].name, role: s.role };
}

export function findingEvent(s: TreasuryState, f: Finding, action: string, details?: NewAuditEvent["details"]): NewAuditEvent {
  return { at: s.now, actor: userActor(s.role), action, target: { type: "finding", id: f.id, label: f.title }, details };
}

/** Returns a resolved map with this finding moved out of open. */
export function resolveFinding(s: TreasuryState, f: Finding, status: Finding["status"], note: string): Record<string, Finding> {
  return {
    ...s.resolved,
    [f.id]: { ...f, status, resolution: { by: PERSONAS[s.role].name, at: s.now, note } },
  };
}
