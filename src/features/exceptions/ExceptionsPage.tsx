import { CheckCircle2 } from "lucide-react";
import { useId, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AGENT_META, type AgentId, type Finding } from "@/agents/types";
import { EmptyState } from "@/components/ui/empty-state/EmptyState";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { Select } from "@/components/ui/select/Select";
import { formatWithCode } from "@/lib/money";
import { useTreasury } from "@/store/useTreasury";
import { PageHeading } from "../shared/PageHeading";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";
import { FindingDetail } from "./FindingDetail";

const VIEWS: Array<{ value: string; label: string; match: (f: Finding) => boolean }> = [
  { value: "open", label: "Open", match: (f) => f.status === "open" },
  { value: "escalated", label: "Escalated", match: (f) => f.status === "escalated" },
  { value: "resolved", label: "Resolved", match: (f) => f.status === "accepted" || f.status === "dismissed" },
  { value: "all", label: "All", match: () => true },
];

export default function ExceptionsPage() {
  const [params, setParams] = useSearchParams();
  const findings = useTreasury((s) => s.findings);
  const agentSelect = useId();
  const requested = params.get("f");
  const requestedFinding = findings.find((f) => f.id === requested);
  // Deep links land on the right tab even when the finding is already resolved.
  const view = params.get("view") ?? (requestedFinding ? VIEWS.find((v) => v.value !== "all" && v.match(requestedFinding))?.value : undefined) ?? "open";
  const agent = (params.get("agent") as AgentId | "all") ?? "all";
  const current = VIEWS.find((v) => v.value === view) ?? VIEWS[0];

  const list = useMemo(() => findings.filter((f) => current.match(f) && (agent === "all" || f.agentId === agent)), [findings, current, agent]);
  const selected = list.find((f) => f.id === requested) ?? requestedFinding ?? list[0];

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeading
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor={agentSelect}>
              Agent
            </label>
            <div className="w-56">
              <Select id={agentSelect} onChange={(e) => set({ agent: e.target.value, f: null })} value={agent}>
                <option value="all">All agents</option>
                {(Object.keys(AGENT_META) as AgentId[]).map((id) => (
                  <option key={id} value={id}>
                    {AGENT_META[id].name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
        description="Every finding from every agent, ranked by severity and then by money at stake. Each one shows why the agent raised it, the records behind it and the steps it took."
        eyebrow="Exceptions"
        title="Agent findings"
      />

      <Tabs
        ariaLabel="Finding status"
        items={VIEWS.map((v) => ({ label: v.label, value: v.value, active: v.value === current.value, count: findings.filter((f) => v.match(f) && (agent === "all" || f.agentId === agent)).length }))}
        onSelect={(v) => set({ view: v, f: null })}
      />

      {list.length === 0 && !selected ? (
        <EmptyState description="Nothing matches this view. New findings land here as the feeds update." icon={<CheckCircle2 aria-hidden="true" className="h-6 w-6" />} title="Queue clear" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-5">
          <nav aria-label="Ranked findings" className="xl:col-span-2">
            <ol className="space-y-2">
              {list.map((f, i) => {
                const active = selected?.id === f.id;
                return (
                  <li key={f.id}>
                    <button
                      aria-current={active ? "true" : undefined}
                      className={[
                        "focus-ring w-full rounded-habibiLg border p-4 text-left shadow-habibiXs transition-colors",
                        active ? "border-brand-300 bg-brand-25" : "border-gray-200 bg-white hover:bg-gray-50",
                      ].join(" ")}
                      data-tour={i === 0 ? "top-finding" : undefined}
                      onClick={() => set({ f: f.id })}
                      type="button"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">#{i + 1}</span>
                        <SeverityBadge severity={f.severity} />
                        {f.status !== "open" ? <FindingStatusBadge status={f.status} /> : null}
                        {f.impactUsd ? <span className="ml-auto text-xs font-semibold tabular-nums text-gray-700">{formatWithCode({ minor: f.impactUsd, currency: "USD" }, { compact: true })}</span> : null}
                      </span>
                      <span className="mt-2 block text-sm font-semibold text-gray-900">{f.title}</span>
                      <span className="mt-1 block text-xs text-gray-600">{AGENT_META[f.agentId].name}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="xl:col-span-3">{selected ? <FindingDetail finding={selected} key={selected.id} /> : null}</div>
        </div>
      )}
    </div>
  );
}
