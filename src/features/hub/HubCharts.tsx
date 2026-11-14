import { LineChart } from "@/components/ui/charts/LineChart";
import { BarList } from "../shared/BarList";
import { Table } from "@/components/ui/table/Table";
import type { TreasurySnapshot } from "@/data/types";
import { formatDate } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { ChartCard, LegendItem } from "../shared/ChartCard";
import { compactMajor, REGION_LABEL, useForecasts, type CashTotals } from "../shared/metrics";

const usd = (minor: number) => formatWithCode({ minor, currency: "USD" }, { compact: true });

export function GroupForecastCard({ snapshot }: { snapshot: TreasurySnapshot }) {
  // A wide chart reads well on a laptop. On a phone the default shape keeps the labels legible.
  const wide = typeof window !== "undefined" && window.matchMedia?.("(min-width: 768px)").matches;
  const base = useForecasts(snapshot, "base");
  const stress = useForecasts(snapshot, "stress");
  const weeks = base.entities[0]?.weeks ?? [];
  const low = Math.min(...stress.group);
  const lowWeek = stress.group.indexOf(low) + 1;
  const takeaway = `Group cash goes from ${usd(base.group[0])} in week 1 to ${usd(base.group[12])} in week 13 in the base case. The stress case bottoms out at ${usd(low)} in week ${lowWeek}.`;

  return (
    <ChartCard
      chart={
        <LineChart
          area
          ariaLabel={takeaway}
          className="h-auto w-full"
          width={wide ? 540 : 360}
          formatValue={(v) => compactMajor(v)}
          series={[
            { label: "Base", values: base.group },
            { label: "Stress", values: stress.group, tone: "info", dashed: true },
          ]}
          xLabels={weeks.map((w) => `W${w.week}`)}
        />
      }
      description="Closing balance in USD, all entities"
      legend={
        <>
          <LegendItem label="Base case" swatch="bg-brand-700" />
          <LegendItem label="Stress case, dashed" swatch="bg-info-500" />
        </>
      }
      table={
        <Table
          caption="Group cash forecast by week, in USD"
          columns={[
            { key: "week", header: "Week" },
            { key: "start", header: "Starts" },
            { key: "base", header: "Base case", align: "right" },
            { key: "stress", header: "Stress case", align: "right" },
          ]}
          rows={weeks.map((w, i) => ({ week: `Week ${w.week}`, start: formatDate(w.startDate), base: usd(base.group[i]), stress: usd(stress.group[i]) }))}
        />
      }
      title="13 week group forecast"
    />
  );
}

export function CashByRegion({ totals }: { totals: CashTotals }) {
  const rows = [...totals.byRegion].sort((a, b) => b.usd - a.usd);
  const share = (v: number) => Math.round((v / totals.totalUsd) * 100);
  const takeaway = `${REGION_LABEL[rows[0].region]} holds ${share(rows[0].usd)}% of group cash. ` + rows.slice(1).map((r) => `${REGION_LABEL[r.region]} ${share(r.usd)}%`).join(", ") + ".";

  return (
    <ChartCard
      chart={
        <div>
          <p className="sr-only">{takeaway}</p>
          <BarList
            label="Cash by region"
            rows={rows.map((r) => ({ key: r.region, label: REGION_LABEL[r.region], value: usd(r.usd), percent: share(r.usd) }))}
          />
          <p className="mt-5 flex items-baseline justify-between border-t border-gray-100 pt-4 text-sm">
            <span className="text-gray-600">Group total</span>
            <span className="font-semibold tabular-nums text-gray-900">{usd(totals.totalUsd)}</span>
          </p>
        </div>
      }
      description="USD equivalent at today's rates"
      table={
        <Table
          caption="Cash by region"
          columns={[
            { key: "region", header: "Region" },
            { key: "usd", header: "Cash", align: "right" },
            { key: "share", header: "Share", align: "right" },
          ]}
          rows={rows.map((r) => ({ region: REGION_LABEL[r.region], usd: usd(r.usd), share: `${share(r.usd)}%` }))}
        />
      }
      title="Cash by region"
    />
  );
}
