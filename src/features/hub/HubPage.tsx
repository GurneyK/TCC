import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SEVERITY_RANK } from "@/agents/types";
import { Alert } from "@/components/ui/alert/Alert";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { formatDate, relativeTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useActor, useOpenFindings, useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { cashTotals } from "../shared/metrics";
import { PageHeading } from "../shared/PageHeading";
import { HubLiquidity } from "./HubLiquidity";
import { HubOverview } from "./HubOverview";
import { HubRisk } from "./HubRisk";

const VIEWS = [
  { value: "overview", label: "Overview" },
  { value: "liquidity", label: "Liquidity" },
  { value: "risk", label: "Risk and controls" },
] as const;

type View = (typeof VIEWS)[number]["value"];

function greeting(iso: string) {
  const h = new Date(iso).getUTCHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function HubPage() {
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.find((v) => v.value === params.get("view"))?.value ?? "overview") as View;
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  const actor = useActor();
  const stale = useStaleSources();
  const open = useOpenFindings();
  const totals = useMemo(() => cashTotals(data, stale), [data, stale]);
  const staleSources = data.sources.filter((s) => stale.has(s.id));

  const pending = data.payments.filter((p) => p.status === "pending_approval").length;
  const urgent = open.filter((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK.high).length;
  const todo =
    actor.role === "treasurer"
      ? `${pending} payment${pending === 1 ? "" : "s"} waiting for your approval`
      : actor.role === "auditor"
        ? "Read only access to every record and the audit trail"
        : `${urgent} high priority finding${urgent === 1 ? "" : "s"} to review`;

  return (
    <div className="space-y-6">
      <PageHeading description={`${formatDate(now)} · ${todo}`} documentTitle="Hub" title={`${greeting(now)}, ${actor.name.split(" ")[0]}`} />

      {staleSources.length ? (
        <Alert title={`${staleSources.map((s) => s.name).join(", ")} is ${relativeTime(staleSources[0].lastSyncAt, now).replace(" ago", "")} late`} variant="warning">
          {totals.staleAccounts} accounts worth {formatWithCode({ minor: totals.staleUsd, currency: "USD" }, { compact: true })} show their last known balance.{" "}
          <a className="focus-ring rounded-h3lSm font-semibold underline" href="#/sources">
            Fix in Data sources
          </a>
        </Alert>
      ) : null}

      <Tabs
        ariaLabel="Hub view"
        items={VIEWS.map((v) => ({ label: v.label, value: v.value, active: v.value === view }))}
        onSelect={(v) => setParams(v === "overview" ? {} : { view: v }, { replace: true })}
      />

      <div className="animate-rise" key={view} role="tabpanel" aria-label={VIEWS.find((v) => v.value === view)?.label}>
        {view === "overview" ? <HubOverview totals={totals} /> : view === "liquidity" ? <HubLiquidity /> : <HubRisk />}
      </div>
    </div>
  );
}
