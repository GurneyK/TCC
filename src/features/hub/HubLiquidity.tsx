import { AlertTriangle, Building2, Gauge, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge/Badge";
import { KpiStrip } from "@/components/ui/dashboard/KpiStrip";
import { Table } from "@/components/ui/table/Table";
import { formatWithCode, toUsd } from "@/lib/money";
import { useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { AnimatedNumber } from "../shared/AnimatedNumber";
import { BarList } from "../shared/BarList";
import { useDaySnapshot, useForecasts } from "../shared/metrics";

const usd = (minor: number) => formatWithCode({ minor, currency: "USD" }, { compact: true });

/** Log scale so 0.5x, 2x and 20x all read differently. The minimum sits at about 40%. */
const headroomPct = (ratio: number) => Math.max(3, Math.min(100, ((Math.log10(Math.max(ratio, 0.1)) + 1) / (Math.log10(50) + 1)) * 100));

type Health = "breach" | "tight" | "healthy";

const HEALTH: Record<Health, { label: string; variant: "error" | "warning" | "success"; bar: string }> = {
  breach: { label: "Below minimum", variant: "error", bar: "bg-error-500" },
  tight: { label: "Tight", variant: "warning", bar: "bg-warning-500" },
  healthy: { label: "Healthy", variant: "success", bar: "bg-success-500" },
};

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-habibiLg border border-gray-200 bg-white p-5 shadow-habibiXs">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function HubLiquidity() {
  const navigate = useNavigate();
  const data = useTreasury((s) => s.data);
  const stale = useStaleSources();
  const snapshot = useDaySnapshot();
  const base = useForecasts(snapshot, "base");
  const stress = useForecasts(snapshot, "stress");

  const rows = useMemo(
    () =>
      data.entities
        .map((e) => {
          const fc = base.entities.find((f) => f.entityId === e.id);
          const today = fc?.weeks[0]?.opening ?? 0;
          const lowest = fc?.lowestClosing ?? 0;
          const min = e.minBalance.minor;
          const ratio = min > 0 ? lowest / min : 99;
          const health: Health = fc?.firstBreachWeek ? "breach" : ratio < 1.5 ? "tight" : "healthy";
          return { id: e.id, name: e.name, country: e.country, currency: e.currency, today, lowest, min, ratio, health, breachWeek: fc?.firstBreachWeek ?? null };
        })
        .sort((a, b) => a.ratio - b.ratio),
    [data.entities, base.entities],
  );

  const banks = useMemo(() => {
    const total = data.accounts.reduce((s, a) => s + toUsd(a.balance, data.rates).minor, 0);
    return data.banks
      .map((b) => {
        const accounts = data.accounts.filter((a) => a.bankId === b.id);
        const value = accounts.reduce((s, a) => s + toUsd(a.balance, data.rates).minor, 0);
        const late = accounts.some((a) => stale.has(a.sourceId));
        return { id: b.id, name: b.name, value, share: total ? (value / total) * 100 : 0, accounts: accounts.length, late };
      })
      .sort((a, b) => b.value - a.value);
  }, [data, stale]);

  const currencies = useMemo(() => {
    const map = new Map<string, number>();
    data.accounts.forEach((a) => map.set(a.currency, (map.get(a.currency) ?? 0) + toUsd(a.balance, data.rates).minor));
    const list = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = list.reduce((s, [, v]) => s + v, 0);
    return list.slice(0, 6).map(([ccy, v]) => ({ ccy, v, share: total ? (v / total) * 100 : 0 }));
  }, [data]);

  const breaches = rows.filter((r) => r.health === "breach").length;
  const tight = rows.filter((r) => r.health === "tight").length;
  const lowStress = Math.min(...stress.group);

  return (
    <div className="space-y-6">
      <KpiStrip
        ariaLabel="Liquidity numbers"
        metrics={[
          { label: "Below minimum in 13 weeks", icon: AlertTriangle, iconTone: breaches ? "error" : "success", value: <AnimatedNumber format={(n) => `${n} of ${rows.length}`} value={breaches} />, helper: breaches ? "Entities that need funding" : "Every entity stays above its floor" },
          { label: "Tight headroom", icon: Gauge, iconTone: "warning", value: <AnimatedNumber format={(n) => String(n)} value={tight} />, helper: "Lowest point under 1.5x the minimum" },
          { label: "Lowest group cash, stress", icon: TrendingDown, iconTone: "info", value: <AnimatedNumber format={usd} value={lowStress} />, helper: `Week ${stress.group.indexOf(lowStress) + 1} if receipts slip` },
          { label: "Largest bank exposure", icon: Building2, iconTone: "brand", value: `${Math.round(banks[0]?.share ?? 0)}%`, helper: banks[0]?.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="min-w-0 overflow-hidden rounded-habibiLg border border-gray-200 bg-white shadow-habibiXs xl:col-span-2">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Headroom by entity</h2>
            <p className="mt-0.5 text-xs text-gray-500">Lowest projected balance in 13 weeks against each minimum. Select a row to open its forecast.</p>
          </div>
          <Table
            caption="Headroom by entity, lowest projected balance against the minimum"
            columns={[
              {
                key: "name",
                header: "Entity",
                render: (r) => (
                  <span>
                    <span className="block font-semibold text-gray-900">{r.country}</span>
                    <span className="block text-xs text-gray-500">{r.name}</span>
                  </span>
                ),
              },
              { key: "today", header: "Today", align: "right", render: (r) => formatWithCode({ minor: r.today, currency: r.currency }, { compact: true }) },
              { key: "lowest", header: "Lowest", align: "right", render: (r) => formatWithCode({ minor: r.lowest, currency: r.currency }, { compact: true }) },
              {
                key: "ratio",
                header: "Headroom",
                render: (r) => (
                  <span className="flex min-w-32 items-center gap-2">
                    <span aria-hidden="true" className="relative h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <span className={["animate-grow absolute inset-y-0 left-0 rounded-full", HEALTH[r.health].bar].join(" ")} style={{ width: `${headroomPct(r.ratio)}%` }} />
                      <span className="absolute inset-y-0 w-px bg-gray-500" style={{ left: `${headroomPct(1)}%` }} />
                    </span>
                    <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-700">{r.ratio >= 100 ? "99x+" : r.ratio >= 10 ? `${Math.round(r.ratio)}x` : `${r.ratio.toFixed(1)}x`}</span>
                  </span>
                ),
              },
              {
                key: "health",
                header: "Status",
                render: (r) => <Badge variant={HEALTH[r.health].variant}>{r.health === "breach" ? `Below in week ${r.breachWeek}` : HEALTH[r.health].label}</Badge>,
              },
            ]}
            getRowKey={(r) => r.id}
            onRowClick={(r) => navigate(`/forecast?entity=${r.id}`)}
            rows={rows}
          />
          <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">The thin line on each bar marks the minimum balance.</p>
        </section>

        <div className="min-w-0 space-y-6">
          <Card subtitle="Share of group cash, USD equivalent" title="Cash by bank">
            <BarList
              label="Cash by bank"
              rows={banks.map((b) => ({
                key: b.id,
                label: b.name,
                value: usd(b.value),
                percent: b.share,
                note: b.late ? <span className="font-semibold text-warning-700">Feed late, last known balances</span> : `${Math.round(b.share)}% · ${b.accounts} accounts`,
              }))}
            />
          </Card>
          <Card subtitle="Top currencies held, USD equivalent" title="Cash by currency">
            <BarList label="Cash by currency" rows={currencies.map((c) => ({ key: c.ccy, label: c.ccy, value: usd(c.v), percent: c.share }))} />
          </Card>
        </div>
      </div>
    </div>
  );
}
