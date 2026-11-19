import { AlertTriangle, CheckCircle2, Clock3, Database, MessageSquareText, MinusCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../badge/Badge";

export interface TraceItem {
  icon?: LucideIcon;
  label: string;
  meta: string;
  status: "complete" | "active" | "warning" | "skipped";
}

export interface TracePanelProps {
  title?: string;
  badge?: string;
  items?: TraceItem[];
}

const defaultTrace: TraceItem[] = [
  { icon: MessageSquareText, label: "Prompt received", meta: "User asked for regional performance", status: "complete" },
  { icon: Database, label: "Sources retrieved", meta: "8 approved documents matched", status: "complete" },
  { icon: Clock3, label: "Analysis running", meta: "Aggregating KPI deltas", status: "active" },
];

export function TracePanel({ badge = "Live", items = defaultTrace, title = "Execution trace" }: TracePanelProps) {
  return (
    <section className="rounded-h3lLg border border-gray-200 bg-white shadow-h3lXs">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {badge ? <Badge variant="brand">{badge}</Badge> : null}
      </div>
      <ol className="divide-y divide-gray-100">
        {items.map((item) => {
          const Icon = item.icon ?? Clock3;
          const done = item.status === "complete";
          const warn = item.status === "warning";
          const skipped = item.status === "skipped";

          return (
            <li className="flex gap-3 p-4" key={item.label}>
              <div
                className={[
                  "h-fit shrink-0 rounded-h3lMd p-2",
                  done ? "bg-success-50 text-success-700" : warn ? "bg-warning-50 text-warning-700" : skipped ? "bg-gray-100 text-gray-500" : "bg-brand-50 text-brand-700",
                ].join(" ")}
              >
                {done ? (
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                ) : warn ? (
                  <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                ) : skipped ? (
                  <MinusCircle aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Icon aria-hidden="true" className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {item.label}
                  <span className="sr-only">, {item.status}</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">{item.meta}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
