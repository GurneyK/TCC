import { useNavigate } from "react-router-dom";
import { AGENT_META, type Finding } from "@/agents/types";
import { StatusDot } from "@/components/ui/status-dot/StatusDot";
import { InsightCard } from "@/components/ui/dashboard/InsightCard";
import { EmptyState } from "@/components/ui/empty-state/EmptyState";
import { relativeTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { CheckCircle2 } from "lucide-react";

const TONE: Record<Finding["severity"], "warning" | "brand" | "neutral"> = { critical: "warning", high: "warning", medium: "brand", low: "neutral" };

export function TopFindings({ findings }: { findings: Finding[] }) {
  const navigate = useNavigate();
  if (!findings.length) {
    return <EmptyState description="The agents have nothing open. New findings land here as the feeds update." icon={<CheckCircle2 aria-hidden="true" className="h-6 w-6" />} title="All clear" />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {findings.map((f) => (
        <InsightCard
          actionLabel="Open finding"
          description={f.summary}
          key={f.id}
          label={`${f.severity} · ${AGENT_META[f.agentId].name}`}
          metric={f.impactUsd ? formatWithCode({ minor: f.impactUsd, currency: "USD" }, { compact: true }) : undefined}
          onAction={() => navigate(`/exceptions?f=${encodeURIComponent(f.id)}`)}
          title={f.title}
          tone={TONE[f.severity]}
        />
      ))}
    </div>
  );
}

export function SourceHealth() {
  const sources = useTreasury((s) => s.data.sources);
  const now = useTreasury((s) => s.now);
  const stale = useStaleSources();
  return (
    <section aria-labelledby="source-health" className="rounded-habibiLg border border-gray-200 bg-white shadow-habibiXs">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900" id="source-health">
          Source health
        </h2>
        <a className="focus-ring rounded-habibiSm text-sm font-semibold text-brand-700" href="#/sources">
          Manage
        </a>
      </div>
      <ul className="divide-y divide-gray-100">
        {sources.map((s) => (
          <li className="flex items-center justify-between gap-3 px-4 py-2.5" key={s.id}>
            <StatusDot label={s.name} tone={stale.has(s.id) ? "warning" : "success"} />
            <span className={["text-xs", stale.has(s.id) ? "font-semibold text-warning-700" : "text-gray-600"].join(" ")}>
              {stale.has(s.id) ? `Delayed, ${relativeTime(s.lastSyncAt, now)}` : relativeTime(s.lastSyncAt, now)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
