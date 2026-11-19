import { ArrowRight, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { type AgentId, type Severity } from "@/agents/types";
import { Badge } from "@/components/ui/badge/Badge";
import { blockingFindings } from "@/lib/approvals";
import { HEDGE_POLICY } from "@/lib/exposure";
import { formatWithCode, toUsd } from "@/lib/money";
import { useOpenFindings } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { useDaySnapshot, useExposures } from "../shared/metrics";
import { AGENT_STYLE } from "../shared/tones";
import { SourceHealth } from "./HubPanels";

const usd = (minor: number) => formatWithCode({ minor, currency: "USD" }, { compact: true });
const SEV: Array<{ key: Severity; label: string; bar: string; dot: string }> = [
  { key: "critical", label: "Critical", bar: "bg-error-500", dot: "bg-error-500" },
  { key: "high", label: "High", bar: "bg-warning-500", dot: "bg-warning-500" },
  { key: "medium", label: "Medium", bar: "bg-info-500", dot: "bg-info-500" },
  { key: "low", label: "Low", bar: "bg-gray-300", dot: "bg-gray-300" },
];

function AgentCards() {
  const open = useOpenFindings();
  const ids: AgentId[] = ["payment_risk", "reconciliation", "cash_forecast", "fx_exposure"];
  return (
    <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {ids.map((id) => {
        const style = AGENT_STYLE[id];
        const Icon = style.icon;
        const mine = open.filter((f) => f.agentId === id);
        const counts = SEV.map((s) => ({ ...s, n: mine.filter((f) => f.severity === s.key).length }));
        return (
          <a className="focus-ring lift group flex flex-col rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs" href={`#/exceptions?agent=${id}`} key={id}>
            <span className="flex items-center gap-3">
              <span className={["flex h-9 w-9 items-center justify-center rounded-h3lMd", style.tile].join(" ")}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-gray-900">{style.short}</span>
              <ChevronRight aria-hidden="true" className="ml-auto h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-4 text-3xl font-semibold tabular-nums text-gray-900">{mine.length}</span>
            <span className="text-xs text-gray-500">open finding{mine.length === 1 ? "" : "s"}</span>
            <span aria-hidden="true" className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
              {counts.map((c) => (c.n ? <span className={["animate-grow h-full", c.bar].join(" ")} key={c.key} style={{ width: `${(c.n / Math.max(1, mine.length)) * 100}%` }} /> : null))}
            </span>
            <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
              {counts
                .filter((c) => c.n)
                .map((c) => (
                  <span className="inline-flex items-center gap-1.5" key={c.key}>
                    <span aria-hidden="true" className={["h-1.5 w-1.5 rounded-full", c.dot].join(" ")} />
                    {c.n} {c.label.toLowerCase()}
                  </span>
                ))}
              {!mine.length ? <span>Nothing open</span> : null}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function PaymentPipeline() {
  const data = useTreasury((s) => s.data);
  const findings = useTreasury((s) => s.findings);
  const stages = useMemo(() => {
    const sumOf = (list: typeof data.payments) => list.reduce((s, p) => s + toUsd(p.amount, data.rates).minor, 0);
    const by = (statuses: string[]) => data.payments.filter((p) => statuses.includes(p.status));
    const pending = by(["pending_approval"]);
    return [
      { key: "draft", label: "Drafts", list: by(["draft"]), tone: "bg-gray-400", note: "Not submitted" },
      { key: "pending", label: "Waiting for approval", list: pending, tone: "bg-brand-600", note: `${pending.filter((p) => blockingFindings(p, findings).length).length} blocked by findings` },
      { key: "approved", label: "Approved", list: by(["approved"]), tone: "bg-info-500", note: "Ready to release" },
      { key: "released", label: "Released", list: by(["released", "acknowledged"]), tone: "bg-success-500", note: "Sent to the bank" },
    ].map((s) => ({ ...s, value: sumOf(s.list) }));
  }, [data, findings]);
  const rejected = data.payments.filter((p) => p.status === "rejected").length;

  return (
    <section className="rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Payment pipeline</h2>
          <p className="mt-0.5 text-xs text-gray-500">Maker submits, checker approves, then release. {rejected} rejected.</p>
        </div>
        <a className="focus-ring inline-flex items-center gap-1 rounded-h3lSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/payments">
          Payments
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      <ol className="stagger mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map((s, i) => (
          <li className="relative rounded-h3lMd border border-gray-200 bg-gray-25 p-4" key={s.key}>
            <span aria-hidden="true" className={["absolute inset-x-4 top-0 h-0.5 rounded-b-full", s.tone].join(" ")} />
            <p className="text-xs font-semibold text-gray-500">
              <span className="sr-only">Step {i + 1}: </span>
              {s.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-gray-900">{s.list.length}</p>
            <p className="text-sm font-medium tabular-nums text-gray-700">{usd(s.value)}</p>
            <p className="mt-2 text-xs text-gray-500">{s.note}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function HedgeCoverage() {
  const snapshot = useDaySnapshot();
  const exposures = useExposures(snapshot);
  const rows = [...exposures].filter((e) => e.net !== 0).sort((a, b) => a.ratio - b.ratio);
  const status = (r: number) => (r < HEDGE_POLICY.min ? { label: "Under", variant: "warning" as const, bar: "bg-warning-500" } : r > HEDGE_POLICY.max ? { label: "Over", variant: "info" as const, bar: "bg-info-500" } : { label: "In policy", variant: "success" as const, bar: "bg-success-500" });

  return (
    <section className="rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Hedge coverage</h2>
          <p className="mt-0.5 text-xs text-gray-500">90 day net exposure covered by forwards. Policy band 60% to 80%.</p>
        </div>
        <a className="focus-ring inline-flex items-center gap-1 rounded-h3lSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/fx">
          FX exposure
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>
      <ul className="mt-5 space-y-3.5">
        {rows.map((e, i) => {
          const s = status(e.ratio);
          const pct = Math.round(e.ratio * 100);
          return (
            <li className="grid grid-cols-12 items-center gap-3" key={e.currency}>
              <span className="col-span-2 text-sm font-semibold text-gray-900">{e.currency}</span>
              <span aria-hidden="true" className="relative col-span-6 h-2.5 overflow-hidden rounded-full bg-gray-100">
                <span className="absolute inset-y-0 bg-success-100" style={{ left: `${HEDGE_POLICY.min * 100}%`, width: `${(HEDGE_POLICY.max - HEDGE_POLICY.min) * 100}%` }} />
                <span className={["animate-grow absolute inset-y-0 left-0 rounded-full", s.bar].join(" ")} style={{ width: `${Math.min(100, pct)}%`, animationDelay: `${i * 60}ms` }} />
              </span>
              <span className="col-span-2 text-right text-sm font-semibold tabular-nums text-gray-900">{pct}%</span>
              <span className="col-span-2 text-right">
                <Badge variant={s.variant}>{s.label}</Badge>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HubRisk() {
  return (
    <div className="space-y-6">
      <AgentCards />
      <PaymentPipeline />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <HedgeCoverage />
        <SourceHealth />
      </div>
    </div>
  );
}
