import { Bot, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AGENT_META, type AgentId, type Severity } from "@/agents/types";
import { TracePanel } from "@/components/ui/agent/TracePanel";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { RunStatusPill } from "@/components/ui/dashboard/RunStatusPill";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { useActor } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { PageHeading } from "../shared/PageHeading";
import { SeverityBadge } from "../shared/SeverityBadge";

const ORDER: AgentId[] = ["payment_risk", "reconciliation", "cash_forecast", "fx_exposure"];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function AgentCard({ id }: { id: AgentId }) {
  const runs = useTreasury((s) => s.runs);
  const findings = useTreasury((s) => s.findings);
  const running = useTreasury((s) => s.running.includes(id));
  const runNow = useTreasury((s) => s.runNow);
  const now = useTreasury((s) => s.now);
  const actor = useActor();
  const navigate = useNavigate();
  const meta = AGENT_META[id];
  const run = runs[id];
  const live = id === "reconciliation" ? runs["recon:live"] : undefined;
  const open = findings.filter((f) => f.agentId === id && (f.status === "open" || f.status === "escalated"));

  return (
    <article aria-labelledby={`agent-${id}`} className="space-y-4 rounded-habibiLg border border-gray-200 bg-white p-5 shadow-habibiXs">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="h-fit rounded-habibiMd bg-brand-50 p-2 text-brand-700">
            <Bot aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900" id={`agent-${id}`}>
              {meta.name}
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-600">{meta.purpose}</p>
          </div>
        </div>
        <RunStatusPill label={running ? "Running" : `Last run ${run ? relativeTime(run.finishedAt, now) : "never"}`} status={running ? "running" : "complete"} />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Open findings</span>
        {open.length ? (
          SEVERITIES.map((s) => {
            const n = open.filter((f) => f.severity === s).length;
            return n ? (
              <span className="inline-flex items-center gap-1" key={s}>
                <SeverityBadge severity={s} />
                <span className="text-sm font-semibold text-gray-900">{n}</span>
              </span>
            ) : null;
          })
        ) : (
          <Badge variant="success">None</Badge>
        )}
      </div>

      <TracePanel
        badge={run ? formatDateTime(run.finishedAt) : ""}
        items={(run?.steps ?? []).map((s) => ({ label: s.label, meta: s.detail, status: s.status === "done" ? "complete" : s.status === "warning" ? "warning" : "skipped" }))}
        title={`Latest trace · ${run?.inputs ?? ""}`}
      />
      {live ? <p className="text-sm text-gray-600">Live feed: {live.suggestions?.length ?? 0} new bank lines matched since the overnight run, rechecked every 30 seconds.</p> : null}

      <details className="rounded-habibiMd border border-gray-200 p-3">
        <summary className="focus-ring cursor-pointer rounded-habibiSm text-sm font-semibold text-gray-900">Rules this agent uses</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {meta.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </details>

      <div className="flex flex-wrap gap-2">
        {actor.role !== "auditor" ? (
          <Button leadingIcon={<Play aria-hidden="true" className="h-4 w-4" />} loading={running} onClick={() => runNow(id)} size="sm">
            Run now
          </Button>
        ) : null}
        <Button onClick={() => navigate(`/exceptions?agent=${id}`)} size="sm" variant="secondaryGray">
          View findings
        </Button>
      </div>
    </article>
  );
}

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        description="Four agents watch the data. Each one is a pure function of the current snapshot, so the same data always gives the same findings. They recommend. They never move money."
        eyebrow="Agents"
        title="Agent operations"
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {ORDER.map((id) => (
          <AgentCard id={id} key={id} />
        ))}
      </div>
    </div>
  );
}
