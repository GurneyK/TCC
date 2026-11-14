import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../badge/Badge";

export interface KpiMetric {
  delta?: string;
  label: string;
  tone?: "success" | "brand" | "warning" | "error" | "neutral" | "info";
  trend?: "up" | "down";
  value: string;
  /** Small line under the value, for context like "Includes stale data". */
  helper?: ReactNode;
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

export function KpiStrip({ ariaLabel = "Key metrics", metrics = defaultMetrics }: KpiStripProps) {
  return (
    <section aria-label={ariaLabel} className="grid overflow-hidden rounded-habibiLg border border-gray-200 bg-white shadow-habibiXs md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const TrendIcon = metric.trend === "down" ? ArrowDownRight : ArrowUpRight;

        return (
          <article className="border-b border-gray-200 p-5 last:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0" key={metric.label}>
            <p className="text-sm font-medium text-gray-500">{metric.label}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-semibold text-gray-900">{metric.value}</p>
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
