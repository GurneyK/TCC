import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { type AgentId, type Finding } from "@/agents/types";
import { EmptyState } from "@/components/ui/empty-state/EmptyState";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { formatWithCode } from "@/lib/money";
import { useTreasury } from "@/store/useTreasury";
import { PageHeading } from "../shared/PageHeading";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";
import { AGENT_STYLE, SEVERITY_EDGE } from "../shared/tones";
import { FindingDetail } from "./FindingDetail";

const VIEWS: Array<{ value: string; label: string; match: (f: Finding) => boolean }> = [
  { value: "open", label: "Open", match: (f) => f.status === "open" },
  { value: "escalated", label: "Escalated", match: (f) => f.status === "escalated" },
  { value: "resolved", label: "Resolved", match: (f) => f.status === "accepted" || f.status === "dismissed" },
  { value: "all", label: "All", match: () => true },
];

function AgentFilter({ value, onChange, counts }: { value: AgentId | "all"; onChange: (v: AgentId | "all") => void; counts: Record<string, number> }) {
  const ids: AgentId[] = ["payment_risk", "reconciliation", "cash_forecast", "fx_exposure"];
  const chip = (active: boolean) =>
    ["focus-ring inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors", active ? "border-brand-300 bg-brand-50 text-brand-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"].join(" ");
  return (
    <div aria-label="Filter by agent" className="flex flex-wrap gap-2" role="group">
      <button aria-pressed={value === "all"} className={chip(value === "all")} onClick={() => onChange("all")} type="button">
        All agents
        <span className="tabular-nums text-gray-500">{counts.all}</span>
      </button>
      {ids.map((id) => {
        const s = AGENT_STYLE[id];
        const Icon = s.icon;
        return (
          <button aria-pressed={value === id} className={chip(value === id)} key={id} onClick={() => onChange(id)} type="button">
            <span className={["flex h-5 w-5 items-center justify-center rounded-full", s.tile].join(" ")}>
              <Icon aria-hidden="true" className="h-3 w-3" />
            </span>
            {s.short}
            <span className="tabular-nums text-gray-500">{counts[id] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function ExceptionsPage() {
  const [params, setParams] = useSearchParams();
  const findings = useTreasury((s) => s.findings);
  const detailRef = useRef<HTMLDivElement>(null);
  const requested = params.get("f");
  const requestedFinding = findings.find((f) => f.id === requested);
  // Deep links land on the right tab even when the finding is already resolved.
  const view = params.get("view") ?? (requestedFinding ? VIEWS.find((v) => v.value !== "all" && v.match(requestedFinding))?.value : undefined) ?? "open";
  const agent = (params.get("agent") as AgentId | "all") ?? "all";
  const current = VIEWS.find((v) => v.value === view) ?? VIEWS[0];

  const inView = useMemo(() => findings.filter((f) => current.match(f)), [findings, current]);
  const list = useMemo(() => inView.filter((f) => agent === "all" || f.agentId === agent), [inView, agent]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: inView.length };
    inView.forEach((f) => (c[f.agentId] = (c[f.agentId] ?? 0) + 1));
    return c;
  }, [inView]);
  const selected = list.find((f) => f.id === requested) ?? requestedFinding ?? list[0];
  const open = findings.filter((f) => f.status === "open");
  const critical = open.filter((f) => f.severity === "critical").length;

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  // When a new finding is picked, bring the top of its detail into view if it has scrolled away.
  useEffect(() => {
    const el = detailRef.current;
    if (!requested || !el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 72 || top > window.innerHeight - 120) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [requested]);

  return (
    <div className="space-y-5">
      <PageHeading description={`${open.length} open, ${critical} critical. Ranked by severity, then money at stake.`} title="Exceptions" />

      <div className={requested ? "hidden space-y-5 xl:block" : "space-y-5"}>
      <AgentFilter counts={counts} onChange={(v) => set({ agent: v === "all" ? null : v, f: null })} value={agent} />

      <Tabs
        ariaLabel="Finding status"
        items={VIEWS.map((v) => ({ label: v.label, value: v.value, active: v.value === current.value, count: findings.filter((f) => v.match(f) && (agent === "all" || f.agentId === agent)).length }))}
        onSelect={(v) => set({ view: v, f: null })}
      />
      </div>

      {list.length === 0 && !selected ? (
        <EmptyState description="Nothing matches this view. New findings land here as the feeds update." icon={<CheckCircle2 aria-hidden="true" className="h-6 w-6" />} title="Queue clear" />
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
          <nav aria-label="Ranked findings" className={["pane-sticky scrollbar-thin xl:col-span-5 2xl:col-span-4", requested ? "hidden xl:block" : ""].join(" ")}>
            <ol className="stagger space-y-2 xl:pr-1">
              {list.map((f, i) => {
                const active = selected?.id === f.id;
                const style = AGENT_STYLE[f.agentId];
                const Icon = style.icon;
                return (
                  <li key={f.id}>
                    <button
                      aria-current={active ? "true" : undefined}
                      className={[
                        "focus-ring relative w-full overflow-hidden rounded-habibiLg border py-3.5 pl-5 pr-4 text-left transition-all",
                        active ? "border-brand-300 bg-white shadow-habibiMd" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-habibiSm",
                      ].join(" ")}
                      data-tour={i === 0 ? "top-finding" : undefined}
                      onClick={() => set({ f: f.id })}
                      type="button"
                    >
                      <span aria-hidden="true" className={["absolute inset-y-0 left-0 w-1", SEVERITY_EDGE[f.severity]].join(" ")} />
                      <span className="flex items-center gap-2">
                        <SeverityBadge severity={f.severity} />
                        {f.status !== "open" ? <FindingStatusBadge status={f.status} /> : null}
                        {f.impactUsd ? <span className="ml-auto text-sm font-semibold tabular-nums text-gray-900">{formatWithCode({ minor: f.impactUsd, currency: "USD" }, { compact: true })}</span> : null}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-5 text-gray-900">{f.title}</span>
                      <span className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
                        {style.short}
                        <span aria-hidden="true">·</span>
                        <span>#{i + 1}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className={["scroll-mt-24 xl:col-span-7 2xl:col-span-8", requested ? "" : "hidden xl:block"].join(" ")} ref={detailRef}>
            {requested ? (
              <button className="focus-ring mb-3 inline-flex items-center gap-1.5 rounded-habibiSm text-sm font-semibold text-brand-700 hover:text-brand-800 xl:hidden" onClick={() => set({ f: null })} type="button">
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                All findings
              </button>
            ) : null}
            {selected ? <FindingDetail finding={selected} key={selected.id} /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
