import type { Finding } from "@/agents/types";
import type {
  AuditEvent,
  BankAccount,
  DataSource,
  FxRate,
  Hedge,
  HedgeRequest,
  Invoice,
  Payment,
  Role,
  Transaction,
} from "@/data/types";

const KEY = "tcc-demo-v1";

/**
 * Only what people change is saved. On load the generator rebuilds the seeded
 * world, this overlay is applied on top, and the agents rerun.
 */
export interface SavedOverlay {
  version: 1;
  seed: number;
  now: string;
  role: Role;
  simSeconds: number;
  rngState: number;
  liveSeq: number;
  speed: 1 | 4;
  paused: boolean;
  payments: Payment[];
  hedges: Hedge[];
  hedgeRequests: HedgeRequest[];
  sources: DataSource[];
  rates: FxRate[];
  txStatus: Record<string, Pick<Transaction, "status" | "matchedInvoiceIds">>;
  invoiceStatus: Record<string, Invoice["status"]>;
  balances: Record<string, Pick<BankAccount, "balance" | "availableBalance">>;
  addedTransactions: Transaction[];
  scopedTxIds: Record<string, string[]>;
  resolved: Record<string, Finding>;
  audit: AuditEvent[];
  seq: number;
  seenFindingIds: string[];
  importCount: number;
  dismissedTour: boolean;
}

export function loadOverlay(): SavedOverlay | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedOverlay;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOverlay(overlay: SavedOverlay) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(overlay));
  } catch {
    // Storage is full or blocked. The demo keeps running in memory.
  }
}

export function clearOverlay() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
