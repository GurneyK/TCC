import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SEVERITY_RANK } from "@/agents/types";
import { Alert } from "@/components/ui/alert/Alert";
import { Button } from "@/components/ui/button/Button";
import { ActivityFeed } from "@/components/ui/dashboard/ActivityFeed";
import { KpiStrip } from "@/components/ui/dashboard/KpiStrip";
import { formatDate, relativeTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useOpenFindings, useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { actorName } from "../shared/format";
import { cashTotals, unhedgedUsd, useDaySnapshot, useExposures } from "../shared/metrics";
import { PageHeading } from "../shared/PageHeading";
import { StaleBadge } from "../shared/StaleBadge";
import { CashByRegion, GroupForecastCard } from "./HubCharts";
import { SourceHealth, TopFindings } from "./HubPanels";

export default function HubPage() {
  const navigate = useNavigate();
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  const audit = useTreasury((s) => s.audit);
  const stale = useStaleSources();
  const open = useOpenFindings();
  const snapshot = useDaySnapshot();
  const exposures = useExposures(snapshot);
  const totals = useMemo(() => cashTotals(data, stale), [data, stale]);
  const staleSources = data.sources.filter((s) => stale.has(s.id));
  const urgent = open.filter((f) => SEVERITY_RANK[f.severity] >= SEVERITY_RANK.high).length;
  const critical = open.filter((f) => f.severity === "critical").length;
  const usd = (minor: number) => formatWithCode({ minor, currency: "USD" }, { compact: true });

  return (
    <div className="space-y-6">
      <PageHeading
        description={`One view of Lumen's cash, risk and data health. Agents watch the feeds and raise findings. People make every decision that moves money.`}
        eyebrow={formatDate(now)}
        title="Treasury hub"
      />

      {staleSources.length ? (
        <Alert title={`${staleSources.map((s) => s.name).join(", ")} is ${relativeTime(staleSources[0].lastSyncAt, now).replace(" ago", "")} stale`} variant="warning">
          {totals.staleAccounts} accounts worth {usd(totals.staleUsd)} show their last known balance.{" "}
          <a className="focus-ring rounded-habibiSm font-semibold underline" href="#/sources">
            Check data sources
          </a>
        </Alert>
      ) : null}

      <div data-tour="total-cash">
        <KpiStrip
          ariaLabel="Key treasury numbers"
          metrics={[
            {
              label: "Total cash",
              value: usd(totals.totalUsd),
              helper: staleSources.length ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  Includes stale data from {staleSources.length} source{staleSources.length === 1 ? "" : "s"}
                  <StaleBadge lastSyncAt={staleSources[0].lastSyncAt} now={now} source={staleSources[0].name} />
                </span>
              ) : (
                "Every feed is current"
              ),
            },
            { label: "Available liquidity", value: usd(totals.availableUsd), helper: "Balances less holds and float" },
            { label: "Unhedged FX exposure", value: usd(unhedgedUsd(exposures, snapshot)), helper: "Next 90 days, all non USD currencies", tone: "warning" },
            {
              label: "Open findings",
              value: String(open.length),
              delta: urgent ? `${critical} critical, ${urgent - critical} high` : undefined,
              tone: critical ? "error" : "warning",
              helper: (
                <a className="focus-ring rounded-habibiSm font-semibold text-brand-700" href="#/exceptions">
                  Review exceptions
                </a>
              ),
            },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <GroupForecastCard snapshot={snapshot} />
        </div>
        <CashByRegion totals={totals} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">Top agent findings</h2>
            <Button onClick={() => navigate("/exceptions")} size="sm" trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />} variant="tertiaryColor">
              All exceptions
            </Button>
          </div>
          <TopFindings findings={open.slice(0, 4)} />
        </div>
        <div className="space-y-6">
          <SourceHealth />
          <ActivityFeed
            items={audit
              .slice(-6)
              .reverse()
              .map((e) => ({
                label: e.action,
                description: `${actorName(e.actor)} · ${e.target.label}`,
                meta: relativeTime(e.at, now),
                status: e.action.includes("rejected") || e.action.includes("Rejected") ? "failed" : "complete",
                type: e.actor.type === "agent" ? "agent" : e.actor.type === "user" ? "message" : "system",
              }))}
            title="Latest activity"
          />
        </div>
      </div>
    </div>
  );
}
