import { ArrowLeftRight, GitCompareArrows, LineChart, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AgentId, Severity } from "@/agents/types";

/** One colour and icon per agent, used everywhere an agent shows up. */
export const AGENT_STYLE: Record<AgentId, { icon: LucideIcon; tile: string; short: string }> = {
  payment_risk: { icon: ShieldCheck, tile: "bg-error-50 text-error-700", short: "Payment Risk" },
  reconciliation: { icon: GitCompareArrows, tile: "bg-info-50 text-info-700", short: "Reconciliation" },
  cash_forecast: { icon: LineChart, tile: "bg-success-50 text-success-700", short: "Cash Forecast" },
  fx_exposure: { icon: ArrowLeftRight, tile: "bg-warning-50 text-warning-700", short: "FX Exposure" },
};

/** Left edge colour for a finding row. */
export const SEVERITY_EDGE: Record<Severity, string> = {
  critical: "bg-error-500",
  high: "bg-warning-500",
  medium: "bg-info-500",
  low: "bg-gray-300",
};

/** Fill colours for small bars, cycled in order. */
export const BAR_TONES = ["bg-brand-600", "bg-info-500", "bg-success-500", "bg-warning-500", "bg-brand-300", "bg-gray-400"] as const;
