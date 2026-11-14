import type { CurrencyCode, Money, TreasurySnapshot } from "@/data/types";
import { TREASURY_CENTRE_ID } from "@/data/world";
import { addDays, isoDate, weekFrom } from "@/lib/dates";
import { formatWithCode, fromUsd, toUsd } from "@/lib/money";
import type { AgentRun, Finding } from "./types";

export const FORECAST_WEEKS = 13;
export type ForecastScenario = "base" | "stress";

export interface ForecastWeek {
  week: number;
  startDate: string;
  opening: number;
  receipts: number;
  supplierPayments: number;
  payroll: number;
  tax: number;
  fxSettlements: number;
  intercompany: number;
  closing: number;
}

export interface EntityForecast {
  entityId: string;
  currency: CurrencyCode;
  minBalance: number;
  weeks: ForecastWeek[];
  firstBreachWeek: number | null;
  lowestClosing: number;
}

const emptyWeek = (week: number, today: string): ForecastWeek => ({
  week,
  startDate: addDays(today, (week - 1) * 7),
  opening: 0,
  receipts: 0,
  supplierPayments: 0,
  payroll: 0,
  tax: 0,
  fxSettlements: 0,
  intercompany: 0,
  closing: 0,
});

/** 13 week forecast per entity in local currency, all integer minor units. */
export function computeForecast(snapshot: TreasurySnapshot, scenario: ForecastScenario = "base"): EntityForecast[] {
  const today = isoDate(snapshot.now);
  const cps = new Map(snapshot.counterparties.map((c) => [c.id, c]));

  return snapshot.entities.map((entity) => {
    const weeks = Array.from({ length: FORECAST_WEEKS }, (_, i) => emptyWeek(i + 1, today));
    const at = (date: string) => {
      const w = weekFrom(today, date);
      return w >= 1 && w <= FORECAST_WEEKS ? weeks[w - 1] : null;
    };
    const opening = snapshot.accounts.filter((a) => a.entityId === entity.id).reduce((s, a) => s + a.balance.minor, 0);

    for (const inv of snapshot.invoices) {
      if (inv.entityId !== entity.id || inv.status === "paid" || inv.status === "disputed") continue;
      if (inv.kind === "AR") {
        const late = (cps.get(inv.counterpartyId)?.avgDaysLate ?? 0) + (scenario === "stress" ? 10 : 0);
        const w = at(addDays(inv.dueDate, late));
        if (w) w.receipts += scenario === "stress" ? Math.round(inv.amount.minor * 0.85) : inv.amount.minor;
      } else {
        const w = at(inv.dueDate);
        if (w) w.supplierPayments += inv.amount.minor;
      }
    }

    // Approved or pending intercompany funding lands in the forecast.
    for (const p of snapshot.payments) {
      if (p.kind !== "intercompany" || !["pending_approval", "approved", "released", "acknowledged"].includes(p.status)) continue;
      if (p.status === "acknowledged") continue;
      const w = at(p.valueDate);
      if (!w) continue;
      const local = p.amount.currency === entity.currency ? p.amount.minor : fromUsd(toUsd(p.amount, snapshot.rates), entity.currency, snapshot.rates).minor;
      if (p.toEntityId === entity.id) w.intercompany += local;
      if (p.entityId === entity.id) w.intercompany -= local;
    }

    if (entity.id !== TREASURY_CENTRE_ID) {
      const payroll = Math.round(opening * 0.01);
      for (let w = 2; w <= FORECAST_WEEKS; w += 2) weeks[w - 1].payroll = payroll;
      weeks[7].tax = Math.round(opening * 0.015);
    }

    let running = opening;
    let firstBreachWeek: number | null = null;
    let lowest = Number.POSITIVE_INFINITY;
    for (const w of weeks) {
      w.opening = running;
      w.closing = w.opening + w.receipts - w.supplierPayments - w.payroll - w.tax - w.fxSettlements + w.intercompany;
      running = w.closing;
      if (w.closing < entity.minBalance.minor && firstBreachWeek === null) firstBreachWeek = w.week;
      lowest = Math.min(lowest, w.closing);
    }

    return { entityId: entity.id, currency: entity.currency, minBalance: entity.minBalance.minor, weeks, firstBreachWeek, lowestClosing: lowest };
  });
}

/** Group total in USD per week. */
export function groupForecastUsd(forecasts: EntityForecast[], snapshot: TreasurySnapshot): number[] {
  return Array.from({ length: FORECAST_WEEKS }, (_, i) =>
    forecasts.reduce((s, f) => s + toUsd({ minor: f.weeks[i].closing, currency: f.currency }, snapshot.rates).minor, 0),
  );
}

/** Amount that restores the minimum plus a 10% buffer, rounded up to the next 100,000. */
export function fundingAmount(f: EntityForecast): Money {
  const needed = Math.round(f.minBalance * 1.1) - f.lowestClosing;
  const step = 100_000 * 100;
  return { minor: Math.ceil(needed / step) * step, currency: f.currency };
}

export function runCashForecast(snapshot: TreasurySnapshot, now: string): AgentRun {
  const base = computeForecast(snapshot, "base");
  const stress = computeForecast(snapshot, "stress");
  const findings: Finding[] = [];

  for (const f of base) {
    if (f.firstBreachWeek === null || f.entityId === TREASURY_CENTRE_ID) continue;
    const entity = snapshot.entities.find((e) => e.id === f.entityId);
    if (!entity) continue;
    const amount = fundingAmount(f);
    const w = f.weeks[f.firstBreachWeek - 1];
    const stressBreach = stress.find((s) => s.entityId === f.entityId)?.firstBreachWeek;
    const short = entity.name.replace("Lumen Brands ", "").replace(/ (Ltda|Ltd|S\.A|GmbH|Inc|Co|Pte|Pvt)\.?.*$/, "");
    findings.push({
      id: `cf-${f.entityId}-w${f.firstBreachWeek}`,
      agentId: "cash_forecast",
      severity: f.firstBreachWeek <= 8 ? "high" : "medium",
      title: `${entity.name} drops below its minimum balance in week ${f.firstBreachWeek}`,
      summary: `The base case closes week ${f.firstBreachWeek} at ${formatWithCode({ minor: w.closing, currency: f.currency }, { compact: true })} against a ${formatWithCode(entity.minBalance, { compact: true })} minimum. Fund ${short} with ${formatWithCode(amount, { compact: true })} from the Treasury Centre.`,
      reasons: [
        `Opening cash is ${formatWithCode({ minor: f.weeks[0].opening, currency: f.currency }, { compact: true })}.`,
        `Supplier payments of ${formatWithCode({ minor: f.weeks.slice(0, f.firstBreachWeek).reduce((s, x) => s + x.supplierPayments, 0), currency: f.currency }, { compact: true })} fall due by week ${f.firstBreachWeek}, against ${formatWithCode({ minor: f.weeks.slice(0, f.firstBreachWeek).reduce((s, x) => s + x.receipts, 0), currency: f.currency }, { compact: true })} of expected receipts.`,
        stressBreach ? `Under stress the breach comes in week ${stressBreach}.` : "The stress case also stays tight.",
        `The recommended amount restores the minimum plus a 10% buffer.`,
      ],
      evidence: [
        { type: "entity", id: entity.id, label: entity.name },
        ...snapshot.invoices
          .filter((i) => i.entityId === entity.id && i.kind === "AP" && i.status === "open")
          .sort((a, b) => b.amount.minor - a.amount.minor)
          .slice(0, 3)
          .map((i) => ({ type: "invoice" as const, id: i.id, label: `${i.number} · ${formatWithCode(i.amount, { compact: true })}` })),
      ],
      confidence: 0.82,
      recommendation: { action: "fund_entity", label: `Fund with ${formatWithCode(amount, { compact: true })} from the Treasury Centre`, amount },
      status: "open",
      createdAt: now,
      impactUsd: toUsd(amount, snapshot.rates).minor,
    });
  }

  const breaches = findings.length;
  return {
    id: `run-cash_forecast-${now}`,
    agentId: "cash_forecast",
    startedAt: now,
    finishedAt: now,
    inputs: `${snapshot.entities.length} entities, ${snapshot.invoices.filter((i) => i.status !== "paid").length} open invoices`,
    steps: [
      { label: "Opening balances", detail: `Read ${snapshot.accounts.length} bank balances across ${snapshot.entities.length} entities`, durationMs: 90, status: "done" },
      { label: "Receipts", detail: "Shifted receivables by each customer's average days late", durationMs: 220, status: "done" },
      { label: "Payments", detail: "Added supplier payments, payroll every 2 weeks and tax dates", durationMs: 180, status: "done" },
      { label: "Scenarios", detail: "Built base and stress cases for 13 weeks", durationMs: 260, status: "done" },
      { label: "Minimum balance check", detail: `Entities under minimum in the base case: ${breaches}`, durationMs: 70, status: breaches ? "warning" : "done" },
    ],
    findings,
  };
}
