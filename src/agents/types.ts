import type { Money, TreasurySnapshot } from "@/data/types";

export type AgentId = "reconciliation" | "payment_risk" | "cash_forecast" | "fx_exposure";

export type Severity = "low" | "medium" | "high" | "critical";

export interface EvidenceRef {
  type: "transaction" | "invoice" | "payment" | "counterparty" | "source" | "fx" | "hedge" | "watchlist" | "entity";
  id: string;
  label: string;
}

export type RecommendationAction =
  | "hold_payment"
  | "verify_callback"
  | "confirm_match"
  | "open_deduction_case"
  | "fund_entity"
  | "book_hedge"
  | "review";

export interface Finding {
  id: string;
  agentId: AgentId;
  severity: Severity;
  title: string;
  summary: string;
  reasons: string[];
  evidence: EvidenceRef[];
  confidence: number;
  recommendation: { action: RecommendationAction; label: string; amount?: Money };
  status: "open" | "accepted" | "dismissed" | "escalated";
  resolution?: { by: string; at: string; note: string };
  createdAt: string;
  /** Used to rank findings of equal severity. USD minor units. */
  impactUsd?: number;
}

export interface TraceStep {
  label: string;
  detail: string;
  durationMs: number;
  status: "done" | "warning" | "skipped";
}

export interface MatchSuggestion {
  transactionId: string;
  invoiceIds: string[];
  rule: "exact" | "strong" | "fee";
  confidence: number;
}

export interface AgentRun {
  id: string;
  agentId: AgentId;
  startedAt: string;
  finishedAt: string;
  inputs: string;
  steps: TraceStep[];
  findings: Finding[];
  suggestions?: MatchSuggestion[];
}

export type Agent = (snapshot: TreasurySnapshot, now: string) => AgentRun;

export const AGENT_META: Record<AgentId, { name: string; purpose: string; rules: string[] }> = {
  reconciliation: {
    name: "Reconciliation Agent",
    purpose: "Matches bank lines to open invoices and flags what it can't explain.",
    rules: [
      "Exact match: same amount and currency, reference quotes the invoice number",
      "Strong match: same counterparty, amount within 0.5%, value date within 5 days of due date",
      "Short pay: customer paid 1% to 8% under the invoice",
      "Bank fees: small debits with FEE or CHG in the reference",
      "Anything unmatched after 3 days becomes an exception",
    ],
  },
  payment_risk: {
    name: "Payment Risk Agent",
    purpose: "Screens every payment waiting for approval and scores it 0 to 100.",
    rules: [
      "Bank details changed in the last 30 days (critical under 7 days)",
      "Same counterparty and amount within 14 days, or near identical invoice numbers",
      "Name similarity of 85% or more to a watchlist entry",
      "More than 3x the counterparty's 6 month median payment",
      "Paying a counterparty from an entity that has never paid it",
    ],
  },
  cash_forecast: {
    name: "Cash Forecast Agent",
    purpose: "Builds a 13 week forecast per entity and warns before anyone runs short.",
    rules: [
      "Opening balance from current bank balances",
      "Receipts shifted by each customer's average days late",
      "Supplier payments, payroll every 2 weeks, tax dates",
      "Stress case: receipts 10 days later and 15% lower",
      "Flags any week under the entity's minimum balance",
    ],
  },
  fx_exposure: {
    name: "FX Exposure Agent",
    purpose: "Measures 3 month currency exposure against the hedge policy.",
    rules: [
      "Net exposure: receivables minus payables per currency, next 90 days",
      "Hedge ratio: maturing hedges divided by net exposure",
      "Policy band 60% to 80%. Below 60% recommends a forward to reach 70%",
      "Above 100% is flagged as over hedged",
      "Forward cost is indicative: current rate plus a fixed spread",
    ],
  },
};

export const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** Small stable hash so batch finding ids stay the same for the same inputs. */
export function stableHash(parts: string[]): string {
  let h = 2166136261;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
