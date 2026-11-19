import { ArrowLeftRight, Droplets, ShieldAlert, Wallet } from "lucide-react";
import { KpiStrip } from "@/components/ui/dashboard/KpiStrip";
import { formatWithCode } from "@/lib/money";
import { useOpenFindings, useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { AnimatedNumber } from "../shared/AnimatedNumber";
import { unhedgedUsd, useDaySnapshot, useExposures, type CashTotals } from "../shared/metrics";
import { StaleBadge } from "../shared/StaleBadge";
import { CashByRegion, GroupForecastCard } from "./HubCharts";
import { ForYou, RecentActivity } from "./HubPanels";

const usd = (minor: number) => formatWithCode({ minor, currency: "USD" }, { compact: true });

export function HubOverview({ totals }: { totals: CashTotals }) {
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  const stale = useStaleSources();
  const open = useOpenFindings();
  const snapshot = useDaySnapshot();
  const exposures = useExposures(snapshot);
  const staleSources = data.sources.filter((s) => stale.has(s.id));
  const critical = open.filter((f) => f.severity === "critical").length;
  const high = open.filter((f) => f.severity === "high").length;

  return (
    <div className="space-y-6">
      <div data-tour="total-cash">
        <KpiStrip
          ariaLabel="Key treasury numbers"
          metrics={[
            {
              label: "Total cash",
              icon: Wallet,
              iconTone: "brand",
              value: <AnimatedNumber format={usd} value={totals.totalUsd} />,
              helper: staleSources.length ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  Includes {staleSources.length} late feed
                  <StaleBadge lastSyncAt={staleSources[0].lastSyncAt} now={now} source={staleSources[0].name} />
                </span>
              ) : (
                "Every feed is current"
              ),
            },
            { label: "Available liquidity", icon: Droplets, iconTone: "info", value: <AnimatedNumber format={usd} value={totals.availableUsd} />, helper: "After holds and float" },
            {
              label: "Unhedged FX, 90 days",
              icon: ArrowLeftRight,
              iconTone: "warning",
              value: <AnimatedNumber format={usd} value={unhedgedUsd(exposures, snapshot)} />,
              helper: "All non USD currencies",
            },
            {
              label: "Open findings",
              icon: ShieldAlert,
              iconTone: critical ? "error" : "warning",
              value: <AnimatedNumber format={(n) => String(n)} value={open.length} />,
              delta: critical || high ? `${critical} critical, ${high} high` : undefined,
              tone: critical ? "error" : "warning",
              helper: (
                <a className="focus-ring rounded-h3lSm font-semibold text-brand-700 hover:text-brand-800" href="#/exceptions">
                  Review exceptions
                </a>
              ),
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <GroupForecastCard snapshot={snapshot} />
        </div>
        <CashByRegion totals={totals} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <ForYou />
        </div>
        <div className="min-w-0">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
