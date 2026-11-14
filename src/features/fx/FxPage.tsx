import { useMemo } from "react";
import { StackedBarChart } from "@/components/ui/charts/StackedBarChart";
import { KpiStrip } from "@/components/ui/dashboard/KpiStrip";
import { Callout } from "@/components/ui/feedback/Callout";
import { Table } from "@/components/ui/table/Table";
import { HEDGE_POLICY } from "@/lib/exposure";
import { formatWithCode } from "@/lib/money";
import { useTreasury } from "@/store/useTreasury";
import { ChartCard, LegendItem } from "../shared/ChartCard";
import { unhedgedUsd, useDaySnapshot, useExposures } from "../shared/metrics";
import { PageHeading } from "../shared/PageHeading";
import { HedgeBook, HedgeRequests, Recommendations } from "./FxPanels";

const pct = (r: number) => `${Math.round(r * 100)}%`;

export default function FxPage() {
  const snapshot = useDaySnapshot();
  const exposures = useExposures(snapshot);
  const all = useTreasury((s) => s.findings);
  const findings = useMemo(() => all.filter((f) => f.agentId === "fx_exposure"), [all]);
  const rows = [...exposures].sort((a, b) => a.ratio - b.ratio);
  const inBand = rows.filter((e) => e.ratio >= HEDGE_POLICY.min && e.ratio <= HEDGE_POLICY.max);
  const under = rows.filter((e) => e.ratio < HEDGE_POLICY.min);
  const status = (r: number) => (r < HEDGE_POLICY.min ? "Under hedged" : r > HEDGE_POLICY.overHedged ? "Over hedged" : r > HEDGE_POLICY.max ? "Above band" : "In policy");
  const takeaway = `${inBand.length} of ${rows.length} currencies sit inside the 60% to 80% band. ${under.map((e) => `${e.currency} is only ${pct(e.ratio)} hedged`).join(". ")}${under.length ? "." : ""}`;

  return (
    <div className="space-y-6">
      <PageHeading
        description="Net receivables minus payables per currency over the next 90 days, against forwards maturing in the same window. Policy says hedge 60% to 80%."
        eyebrow="FX exposure"
        title="Currency risk against policy"
      />

      <KpiStrip
        ariaLabel="FX summary"
        metrics={[
          { label: "Currencies in policy", value: `${inBand.length} of ${rows.length}`, tone: inBand.length === rows.length ? "success" : "warning" },
          { label: "Under hedged", value: String(under.length), delta: under.map((e) => e.currency).join(", ") || undefined, tone: "warning" },
          { label: "Unhedged exposure", value: formatWithCode({ minor: unhedgedUsd(exposures, snapshot), currency: "USD" }, { compact: true }), helper: "USD equivalent, next 90 days" },
          { label: "Forwards outstanding", value: String(snapshot.hedges.length), helper: "Across 5 banks" },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard
            chart={
              <StackedBarChart
                ariaLabel={takeaway}
                bars={rows.map((e) => ({
                  label: e.currency,
                  marker: HEDGE_POLICY.target * 100,
                  segments: [
                    { label: "Hedged", percent: Math.min(100, e.ratio * 100), tone: e.ratio < HEDGE_POLICY.min ? "warning" : "brand" },
                    { label: "Open", percent: Math.max(0, 100 - e.ratio * 100), tone: "neutral" },
                  ],
                }))}
              />
            }
            description="Share of net exposure covered by forwards. The dark line marks the 70% target."
            legend={
              <>
                <LegendItem label="Hedged, in band" swatch="bg-brand-700" />
                <LegendItem label="Hedged, under 60%" swatch="bg-warning-500" />
                <LegendItem label="Open exposure" swatch="bg-gray-300" />
              </>
            }
            table={
              <Table
                caption="Hedge ratio by currency"
                columns={[
                  { key: "ccy", header: "Currency" },
                  { key: "net", header: "Net exposure", align: "right" },
                  { key: "hedged", header: "Hedged", align: "right" },
                  { key: "ratio", header: "Ratio", align: "right" },
                  { key: "status", header: "Policy" },
                ]}
                rows={rows.map((e) => ({
                  ccy: e.currency,
                  net: formatWithCode({ minor: Math.abs(e.net), currency: e.currency }, { compact: true }),
                  hedged: formatWithCode({ minor: e.hedged, currency: e.currency }, { compact: true }),
                  ratio: pct(e.ratio),
                  status: status(e.ratio),
                }))}
              />
            }
            title="Hedge coverage by currency"
          />
        </div>
        <div className="space-y-4 xl:col-span-2">
          <Recommendations findings={findings} />
          <Callout title="Indicative pricing">Forward costs use the current rate plus a fixed 15 basis point spread. A dealer quote replaces it at booking.</Callout>
        </div>
      </div>

      <HedgeRequests />
      <HedgeBook />
    </div>
  );
}
