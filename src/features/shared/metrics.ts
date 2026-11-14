import { useMemo } from "react";
import { computeForecast, groupForecastUsd, type ForecastScenario } from "@/agents/cashForecast";
import type { Region, TreasuryData, TreasurySnapshot } from "@/data/types";
import { isoDate } from "@/lib/dates";
import { computeExposures, type CurrencyExposure } from "@/lib/exposure";
import { toUsd } from "@/lib/money";
import { useTreasury } from "@/store/useTreasury";

/** A snapshot that only changes when data changes or the day rolls over. Keeps heavy views from recomputing every tick. */
export function useDaySnapshot(): TreasurySnapshot {
  const data = useTreasury((s) => s.data);
  const day = useTreasury((s) => isoDate(s.now));
  return useMemo(() => ({ ...data, now: `${day}T09:00:00.000Z` }), [data, day]);
}

export interface CashTotals {
  totalUsd: number;
  availableUsd: number;
  staleUsd: number;
  staleAccounts: number;
  byRegion: Array<{ region: Region; usd: number }>;
}

export function cashTotals(data: TreasuryData, stale: Set<string>): CashTotals {
  const entityRegion = new Map(data.entities.map((e) => [e.id, e.region]));
  const regions: Record<Region, number> = { NA: 0, LATAM: 0, EMEA: 0, APAC: 0 };
  let totalUsd = 0;
  let availableUsd = 0;
  let staleUsd = 0;
  let staleAccounts = 0;
  for (const a of data.accounts) {
    const usd = toUsd(a.balance, data.rates).minor;
    totalUsd += usd;
    availableUsd += toUsd(a.availableBalance, data.rates).minor;
    regions[entityRegion.get(a.entityId) ?? "NA"] += usd;
    if (stale.has(a.sourceId)) {
      staleUsd += usd;
      staleAccounts += 1;
    }
  }
  return {
    totalUsd,
    availableUsd,
    staleUsd,
    staleAccounts,
    byRegion: (Object.keys(regions) as Region[]).map((region) => ({ region, usd: regions[region] })),
  };
}

export const REGION_LABEL: Record<Region, string> = { NA: "North America", LATAM: "Latin America", EMEA: "Europe, Middle East, Africa", APAC: "Asia Pacific" };

export function unhedgedUsd(exposures: CurrencyExposure[], snapshot: TreasurySnapshot) {
  return exposures.reduce((sum, e) => sum + toUsd({ minor: Math.max(0, Math.abs(e.net) - e.hedged), currency: e.currency }, snapshot.rates).minor, 0);
}

export function useExposures(snapshot: TreasurySnapshot) {
  return useMemo(() => computeExposures(snapshot.invoices, snapshot.hedges, isoDate(snapshot.now)), [snapshot]);
}

export function useForecasts(snapshot: TreasurySnapshot, scenario: ForecastScenario) {
  return useMemo(() => {
    const entities = computeForecast(snapshot, scenario);
    return { entities, group: groupForecastUsd(entities, snapshot) };
  }, [snapshot, scenario]);
}

/** Compact millions or billions for chart axes, as plain text. */
export function compactMajor(minor: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "code", notation: "compact", maximumFractionDigits: 1 }).format(minor / 100);
}
