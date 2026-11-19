import { useState } from "react";
import { type Finding } from "@/agents/types";
import { EvidenceList } from "@/components/ui/agent/EvidenceList";
import { TracePanel } from "@/components/ui/agent/TracePanel";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { formatDateTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { runForFinding } from "@/store/engine";
import { useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { AuditTimeline } from "../shared/AuditTimeline";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";
import { AGENT_STYLE, SEVERITY_EDGE } from "../shared/tones";
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

type Tab = "evidence" | "trace" | "history";

export function FindingDetail({ finding }: { finding: Finding }) {
  const runs = useTreasury((s) => s.runs);
  const data = useTreasury((s) => s.data);
  const openRecord = useUi((s) => s.openRecord);
  const [tab, setTab] = useState<Tab>("evidence");
  const run = runForFinding(runs, finding.id) ?? runs[finding.agentId];
  const style = AGENT_STYLE[finding.agentId];
  const AgentIcon = style.icon;
  const confidence = Math.round(finding.confidence * 100);
  const txLabel = (id: string, label: string) => {
    const t = data.transactions.find((x) => x.id === id);
    return t ? `${t.counterparty} · ${formatWithCode(t.amount)}` : label;
  };

  return (
    <article aria-labelledby="finding-title" className="animate-rise overflow-hidden rounded-h3lLg border border-gray-200 bg-white shadow-h3lXs" data-tour="finding-detail">
      <div aria-hidden="true" className={["h-1", SEVERITY_EDGE[finding.severity]].join(" ")} />
      <div className="space-y-5 p-6">
        <header>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <FindingStatusBadge status={finding.status} />
            <span className="ml-auto text-xs text-gray-500">Raised {formatDateTime(finding.createdAt)}</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold tracking-tight text-gray-900" id="finding-title">
            {finding.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-700">{finding.summary}</p>
        </header>

        <dl className="grid gap-px overflow-hidden rounded-h3lMd border border-gray-200 bg-gray-200 sm:grid-cols-3">
          <div className="bg-white p-4">
            <dt className="text-xs font-medium text-gray-500">Raised by</dt>
            <dd className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <span className={["flex h-6 w-6 items-center justify-center rounded-h3lSm", style.tile].join(" ")}>
                <AgentIcon aria-hidden="true" className="h-3.5 w-3.5" />
              </span>
              {style.short}
            </dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs font-medium text-gray-500">Money at stake</dt>
            <dd className="mt-1.5 text-sm font-semibold tabular-nums text-gray-900">{finding.impactUsd ? formatWithCode({ minor: finding.impactUsd, currency: "USD" }) : "None"}</dd>
          </div>
          <div className="bg-white p-4">
            <dt className="text-xs font-medium text-gray-500">Confidence</dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <span className="animate-grow block h-full rounded-full bg-brand-600" style={{ width: `${confidence}%` }} />
              </span>
              <span className="text-sm font-semibold tabular-nums text-gray-900">{confidence}%</span>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="why-title">
          <h3 className="text-sm font-semibold text-gray-900" id="why-title">
            Why it was raised
          </h3>
          <ol className="mt-3 space-y-2.5">
            {finding.reasons.map((r, i) => (
              <li className="flex gap-3 text-sm leading-6 text-gray-700" key={r}>
                <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ol>
        </section>

        <FindingActions finding={finding} />

        <div>
          <Tabs
            ariaLabel="Finding details"
            items={[
              { label: "Evidence", value: "evidence", active: tab === "evidence", count: finding.evidence.length },
              { label: "Agent trace", value: "trace", active: tab === "trace", count: run?.steps.length },
              { label: "History", value: "history", active: tab === "history" },
            ]}
            onSelect={(v) => setTab(v as Tab)}
          />
          <div className="animate-rise pt-4" key={tab} role="tabpanel" aria-label={tab === "evidence" ? "Evidence" : tab === "trace" ? "Agent trace" : "History"}>
            {tab === "evidence" ? (
              <EvidenceList
                items={finding.evidence.map((e) => ({
                  label: e.type === "transaction" ? txLabel(e.id, e.label) : e.label,
                  meta: EVIDENCE_LABEL[e.type] ?? e.type,
                  tone: e.type === "watchlist" || e.type === "counterparty" ? "brand" : "neutral",
                  openLabel: `Open ${(EVIDENCE_LABEL[e.type] ?? "record").toLowerCase()}`,
                  onOpen: () => openRecord(e),
                }))}
                title="Records behind this finding"
              />
            ) : tab === "trace" ? (
              <TracePanel
                badge={run ? formatDateTime(run.finishedAt) : ""}
                items={(run?.steps ?? []).map((s) => ({ label: s.label, meta: s.detail, status: s.status === "done" ? "complete" : s.status === "warning" ? "warning" : "skipped" }))}
                title="What the agent checked"
              />
            ) : (
              <AuditTimeline ids={[finding.id]} />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
