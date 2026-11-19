import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../badge/Badge";

type Tone = "success" | "brand" | "warning" | "error" | "neutral" | "info";

export interface KpiMetric {
  delta?: string;
  label: string;
  tone?: Tone;
  trend?: "up" | "down";
  value: ReactNode;
  /** Small line under the value, for context like "Includes stale data". */
  helper?: ReactNode;
  /** Icon in a tinted tile next to the label. */
  icon?: LucideIcon;
  /** Tile colour. Defaults to the metric tone. */
  iconTone?: Tone;
}

export interface KpiStripProps {
  metrics?: KpiMetric[];
  ariaLabel?: string;
}

const defaultMetrics: KpiMetric[] = [
  { delta: "+12.4%", label: "Agent runs", tone: "success", trend: "up", value: "18.4k" },
  { delta: "+4.8%", label: "Source coverage", tone: "success", trend: "up", value: "96%" },
  { delta: "-1.2s", label: "Avg. latency", tone: "brand", trend: "down", value: "1.8s" },
  { delta: "+3", label: "Open reviews", tone: "warning", trend: "up", value: "12" },
];

const tileClasses: Record<Tone, string> = {
  success: "bg-success-50 text-success-700",
  brand: "bg-brand-50 text-brand-700",
  warning: "bg-warning-50 text-warning-700",
  error: "bg-error-50 text-error-700",
  neutral: "bg-gray-100 text-gray-700",
  info: "bg-info-50 text-info-700",
};

export function KpiStrip({ ariaLabel = "Key metrics", metrics = defaultMetrics }: KpiStripProps) {
  return (
    <section aria-label={ariaLabel} className="grid overflow-hidden rounded-h3lLg border border-gray-200 bg-white shadow-h3lXs md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const TrendIcon = metric.trend === "down" ? ArrowDownRight : ArrowUpRight;
        const Icon = metric.icon;

        return (
          <article className="border-b border-gray-200 p-5 last:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0" key={metric.label}>
            <div className="flex items-center gap-3">
              {Icon ? (
                <span className={["flex h-8 w-8 shrink-0 items-center justify-center rounded-h3lMd", tileClasses[metric.iconTone ?? metric.tone ?? "neutral"]].join(" ")}>
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
              ) : null}
              <p className="text-sm font-medium text-gray-500">{metric.label}</p>
            </div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold tabular-nums text-gray-900">{metric.value}</p>
              {metric.delta ? (
                <Badge variant={metric.tone ?? "neutral"}>
                  {metric.trend ? <TrendIcon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                  {metric.delta}
                </Badge>
              ) : null}
            </div>
            {metric.helper ? <div className="mt-2 text-xs text-gray-500">{metric.helper}</div> : null}
          </article>
        );
      })}
    </section>
  );
}
