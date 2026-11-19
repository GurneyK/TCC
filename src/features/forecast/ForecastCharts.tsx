import type { EntityForecast, ForecastScenario } from "@/agents/cashForecast";
import { LineChart } from "@/components/ui/charts/LineChart";
import { WaterfallChart, type WaterfallStep } from "@/components/ui/charts/WaterfallChart";
import { Table } from "@/components/ui/table/Table";
import type { CurrencyCode, Entity } from "@/data/types";
import { formatWithCode } from "@/lib/money";
import { ChartCard, LegendItem } from "../shared/ChartCard";
import { compactMajor } from "../shared/metrics";

interface Props {
  entity?: Entity;
  forecast?: EntityForecast;
  group: number[];
  scenario: ForecastScenario;
}

const fmt = (minor: number, currency: CurrencyCode) => formatWithCode({ minor, currency }, { compact: true });

export function ForecastCharts({ entity, forecast, group, scenario }: Props) {
  const currency: CurrencyCode = entity?.currency ?? "USD";
  const closing = forecast ? forecast.weeks.map((w) => w.closing) : group;
  const min = forecast?.minBalance;
  const breach = forecast?.firstBreachWeek ?? null;
  const name = entity?.name ?? "Group";

  const lineTakeaway = breach
    ? `${name} falls below its ${fmt(min ?? 0, currency)} minimum in week ${breach} of the ${scenario} case, closing at ${fmt(closing[breach - 1], currency)}.`
    : `${name} stays ${min !== undefined ? `above its ${fmt(min, currency)} minimum` : "positive"} for all 13 weeks of the ${scenario} case, ending at ${fmt(closing[12], currency)}.`;

  const weeks = forecast?.weeks ?? [];
  const sum = (k: keyof EntityForecast["weeks"][number]) => weeks.reduce((s, w) => s + (w[k] as number), 0);
  const steps: WaterfallStep[] = forecast
    ? [
        { label: "Opening", value: weeks[0].opening, type: "total" },
        { label: "Receipts", value: sum("receipts"), type: "increase" },
        { label: "Suppliers", value: -sum("supplierPayments"), type: "decrease" },
        { label: "Payroll", value: -sum("payroll"), type: "decrease" },
        { label: "Tax", value: -sum("tax"), type: "decrease" },
        { label: "FX", value: -sum("fxSettlements"), type: "decrease" },
        { label: "Interco", value: sum("intercompany"), type: sum("intercompany") >= 0 ? "increase" : "decrease" },
        { label: "Closing", value: weeks[12].closing, type: "total" },
      ]
    : [];
  const waterfallTakeaway = forecast
    ? `Over 13 weeks ${name} starts at ${fmt(steps[0].value, currency)}, receives ${fmt(steps[1].value, currency)}, pays suppliers ${fmt(-steps[2].value, currency)} and closes at ${fmt(steps[7].value, currency)}.`
    : "";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div>
        <ChartCard
          chart={
            <LineChart
              area
              ariaLabel={lineTakeaway}
              className="h-auto w-full"
              width={480}
              formatValue={(v) => compactMajor(v, currency)}
              series={[{ label: "Closing balance", values: closing }]}
              threshold={min !== undefined ? { label: `Minimum ${fmt(min, currency)}`, value: min } : undefined}
              xLabels={closing.map((_, i) => `W${i + 1}`)}
            />
          }
          description={`Closing balance by week in ${currency}, ${scenario} case`}
          legend={
            <>
              <LegendItem label="Closing balance" swatch="bg-brand-700" />
              {min !== undefined ? <LegendItem label="Minimum balance, dashed" swatch="bg-error-500" /> : null}
              {breach ? <span className="font-semibold text-error-700">Breach from week {breach}</span> : null}
            </>
          }
          table={
            <Table
              caption={`${name} closing balance by week`}
              columns={[
                { key: "week", header: "Week" },
                { key: "closing", header: "Closing", align: "right" },
                { key: "status", header: "Against minimum" },
              ]}
              rows={closing.map((c, i) => ({
                week: `Week ${i + 1}`,
                closing: fmt(c, currency),
                status: min === undefined ? "Not set" : c < min ? "Below minimum" : "Above minimum",
              }))}
            />
          }
          title="13 week outlook"
        />
      </div>
      <div>
        {forecast ? (
          <ChartCard
            chart={<WaterfallChart ariaLabel={waterfallTakeaway} className="h-auto w-full" steps={steps} />}
            description={`What moves cash over the 13 weeks, in ${currency}`}
            legend={
              <>
                <LegendItem label="Totals" swatch="bg-brand-700" />
                <LegendItem label="Inflows" swatch="bg-success-500" />
                <LegendItem label="Outflows" swatch="bg-error-500" />
              </>
            }
            table={
              <Table
                caption={`${name} forecast drivers`}
                columns={[
                  { key: "label", header: "Driver" },
                  { key: "value", header: currency, align: "right" },
                ]}
                rows={steps.map((s) => ({ label: s.label, value: fmt(s.value, currency) }))}
              />
            }
            title="Drivers"
          />
        ) : (
          <section className="rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs">
            <h3 className="text-sm font-semibold text-gray-900">Drivers</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">Drivers are in local currency, so they show per entity. Pick an entity above to see them.</p>
          </section>
        )}
      </div>
    </div>
  );
}
