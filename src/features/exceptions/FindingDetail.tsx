import { AGENT_META, type Finding } from "@/agents/types";
import { Badge } from "@/components/ui/badge/Badge";
import { EvidenceList } from "@/components/ui/agent/EvidenceList";
import { TracePanel } from "@/components/ui/agent/TracePanel";
import { Progress } from "@/components/ui/progress/Progress";
import { formatDateTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { runForFinding } from "@/store/engine";
import { useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { AuditTimeline } from "../shared/AuditTimeline";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";
import { FindingActions } from "./FindingActions";

const EVIDENCE_LABEL: Record<string, string> = {
  transaction: "Bank line",
  invoice: "Invoice",
  payment: "Payment",
  counterparty: "Counterparty",
  source: "Data source",
  fx: "Market rate",
  hedge: "Hedge",
  watchlist: "Watchlist",
  entity: "Entity",
};

export function FindingDetail({ finding }: { finding: Finding }) {
  const runs = useTreasury((s) => s.runs);
  const data = useTreasury((s) => s.data);
  const openRecord = useUi((s) => s.openRecord);
  const run = runForFinding(runs, finding.id) ?? runs[finding.agentId];
  const meta = AGENT_META[finding.agentId];
  const txLabel = (id: string, label: string) => {
    const t = data.transactions.find((x) => x.id === id);
    return t ? `${t.counterparty} · ${formatWithCode(t.amount)}` : label;
  };

  return (
    <article aria-labelledby="finding-title" className="space-y-5 rounded-habibiLg border border-gray-200 bg-white p-5 shadow-habibiXs" data-tour="finding-detail">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <FindingStatusBadge status={finding.status} />
          <Badge variant="neutral">{meta.name}</Badge>
          <span className="text-xs text-gray-600">Raised {formatDateTime(finding.createdAt)}</span>
        </div>
        <h2 className="mt-3 text-xl font-semibold text-gray-900" id="finding-title">
          {finding.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-700">{finding.summary}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-habibiMd border border-gray-200 p-4">
          <Progress label="Agent confidence" value={Math.round(finding.confidence * 100)} />
        </div>
        <div className="rounded-habibiMd border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700">Recommendation</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{finding.recommendation.label}</p>
          {finding.recommendation.amount ? <p className="mt-1 text-xs text-gray-600">{formatWithCode(finding.recommendation.amount)}</p> : null}
        </div>
      </div>

      <section aria-labelledby="why-title">
        <h3 className="text-sm font-semibold text-gray-900" id="why-title">
          Why the agent raised it
        </h3>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-gray-700">
          {finding.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </section>

      <FindingActions finding={finding} />

      <div className="grid gap-4 lg:grid-cols-2">
        <EvidenceList
          items={finding.evidence.map((e) => ({
            label: e.type === "transaction" ? txLabel(e.id, e.label) : e.label,
            meta: EVIDENCE_LABEL[e.type] ?? e.type,
            tone: e.type === "watchlist" || e.type === "counterparty" ? "brand" : "neutral",
            openLabel: `Open ${(EVIDENCE_LABEL[e.type] ?? "record").toLowerCase()}`,
            onOpen: () => openRecord(e),
          }))}
          title="Evidence"
        />
        <TracePanel
          badge={run ? formatDateTime(run.finishedAt) : ""}
          items={(run?.steps ?? []).map((s) => ({ label: s.label, meta: s.detail, status: s.status === "done" ? "complete" : s.status === "warning" ? "warning" : "skipped" }))}
          title="Agent trace"
        />
      </div>

      <section aria-labelledby="finding-history">
        <h3 className="mb-3 text-sm font-semibold text-gray-900" id="finding-history">
          History
        </h3>
        <AuditTimeline ids={[finding.id]} />
      </section>
    </article>
  );
}
