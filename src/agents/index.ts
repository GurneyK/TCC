import type { TreasurySnapshot } from "@/data/types";
import { runCashForecast } from "./cashForecast";
import { runFxExposure } from "./fxExposure";
import { runPaymentRisk } from "./paymentRisk";
import { runReconciliation } from "./reconciliation";
import type { AgentId, AgentRun } from "./types";

export const AGENTS: Record<AgentId, (snapshot: TreasurySnapshot, now: string) => AgentRun> = {
  reconciliation: (s, n) => runReconciliation(s, n),
  payment_risk: runPaymentRisk,
  cash_forecast: runCashForecast,
  fx_exposure: runFxExposure,
};

export const AGENT_IDS = Object.keys(AGENTS) as AgentId[];
