import type { AgentId, Finding } from "@/agents/types";
import type { AuditEvent, HedgeRequest, Role, TreasuryData } from "@/data/types";
import type { StatementRow } from "@/lib/csv";
import type { NewAuditEvent, Runs } from "./engine";

export interface ImportSummary {
  batchId: string;
  imported: number;
  matched: number;
  fees: number;
  shortPays: number;
  exceptions: number;
  unmatched: number;
}

export interface CoreState {
  seed: number;
  now: string;
  role: Role;
  data: TreasuryData;
  hedgeRequests: HedgeRequest[];
  runs: Runs;
  /** Transaction ids owned by a scoped reconciliation run: `live`, `import-1`, ... */
  scopedTxIds: Record<string, string[]>;
  resolved: Record<string, Finding>;
  findings: Finding[];
  audit: AuditEvent[];
  seq: number;
  seenFindingIds: string[];
  /** Ids of accounts or sources that someone has manually synced. */
  sim: { paused: boolean; speed: 1 | 4; simSeconds: number; rngState: number; liveSeq: number };
  importCount: number;
  dismissedTour: boolean;
  /** Latest message for the single polite live region. */
  announcement: { id: number; text: string } | null;
  /** Agents that are visibly running right now (for Run now). */
  running: AgentId[];
}

export interface Commit {
  data?: TreasuryData;
  hedgeRequests?: HedgeRequest[];
  resolved?: Record<string, Finding>;
  scopedTxIds?: Record<string, string[]>;
  events?: NewAuditEvent[];
  rerun?: AgentId[];
  importCount?: number;
}

export interface Actions {
  reset: () => void;
  setRole: (role: Role) => void;
  tick: () => void;
  setPaused: (paused: boolean) => void;
  setSpeed: (speed: 1 | 4) => void;
  dismissTour: (value: boolean) => void;
  runNow: (agent: AgentId) => void;

  acceptFinding: (id: string) => { ok: boolean; message: string; paymentId?: string };
  dismissFinding: (id: string, reason: string) => void;
  escalateFinding: (id: string, note: string) => void;
  verifyCallback: (id: string, confirmed: boolean, note: string) => void;

  submitPayment: (id: string) => { ok: boolean; message: string };
  approvePayment: (id: string, comment: string) => { ok: boolean; message: string };
  rejectPayment: (id: string, comment: string) => { ok: boolean; message: string };
  releaseApproved: () => { ok: boolean; message: string };

  bookHedge: (requestId: string) => { ok: boolean; message: string };
  retrySync: (sourceId: string) => void;
  importStatement: (rows: StatementRow[], fileName: string) => ImportSummary;
}

export type TreasuryState = CoreState & Actions;
export type Setter = (partial: Partial<TreasuryState> | ((s: TreasuryState) => Partial<TreasuryState>)) => void;
export type Getter = () => TreasuryState;
