import type { TreasurySnapshot } from "@/data/types";
import { isoDate } from "@/lib/dates";
import { computeExposures, FORWARD_SPREAD, HEDGE_POLICY } from "@/lib/exposure";
import { formatWithCode, rateFor, toUsd } from "@/lib/money";
import type { AgentRun, Finding } from "./types";

export function forwardQuote(currency: Parameters<typeof rateFor>[0], notionalMinor: number, snapshot: TreasurySnapshot) {
  const rate = rateFor(currency, snapshot.rates);
  const indicativeRate = Number((rate * (1 - FORWARD_SPREAD)).toFixed(5));
  return {
    indicativeRate,
    usdMinor: Math.round(notionalMinor * indicativeRate),
    spreadCostUsdMinor: Math.round(notionalMinor * rate * FORWARD_SPREAD),
  };
}

export function runFxExposure(snapshot: TreasurySnapshot, now: string): AgentRun {
  const exposures = computeExposures(snapshot.invoices, snapshot.hedges, isoDate(now));
  const findings: Finding[] = [];

  for (const e of exposures) {
    if (e.net === 0) continue;
    const net = { minor: Math.abs(e.net), currency: e.currency };
    const pct = Math.round(e.ratio * 100);
    if (e.ratio < HEDGE_POLICY.min) {
      const notional = { minor: Math.round(Math.abs(e.net) * HEDGE_POLICY.target) - e.hedged, currency: e.currency };
      const quote = forwardQuote(e.currency, notional.minor, snapshot);
      findings.push({
        id: `fx-${e.currency}-under`,
        agentId: "fx_exposure",
        severity: "medium",
        title: `${e.currency} exposure is only ${pct}% hedged`,
        summary: `${formatWithCode(net, { compact: true })} of net ${e.net > 0 ? "receivables" : "payables"} over the next 3 months, against a 60% to 80% policy. Book a ${formatWithCode(notional, { compact: true })} forward to reach 70%.`,
        reasons: [
          `Net ${e.currency} exposure for the next 90 days is ${formatWithCode(net, { compact: true })}.`,
          `Hedges maturing in the window cover ${formatWithCode({ minor: e.hedged, currency: e.currency }, { compact: true })}, which is ${pct}%.`,
          `Policy requires 60% to 80%. A ${formatWithCode(notional, { compact: true })} forward brings it to 70%.`,
          `Indicative cost about ${formatWithCode({ minor: quote.spreadCostUsdMinor, currency: "USD" })} in spread at ${quote.indicativeRate} USD per ${e.currency}.`,
        ],
        evidence: [
          { type: "fx", id: `${e.currency}/USD`, label: `${e.currency}/USD rate` },
          ...snapshot.hedges.filter((h) => h.currency === e.currency).map((h) => ({ type: "hedge" as const, id: h.id, label: `${h.id} · ${formatWithCode(h.notional, { compact: true })}` })),
        ],
        confidence: 0.86,
        recommendation: { action: "book_hedge", label: `Book a ${formatWithCode(notional, { compact: true })} forward`, amount: notional },
        status: "open",
        createdAt: now,
        impactUsd: toUsd(notional, snapshot.rates).minor,
      });
    } else if (e.ratio > HEDGE_POLICY.overHedged) {
      findings.push({
        id: `fx-${e.currency}-over`,
        agentId: "fx_exposure",
        severity: "medium",
        title: `${e.currency} is over hedged at ${pct}%`,
        summary: `Hedges exceed the exposure they cover. Review whether to unwind part of the position.`,
        reasons: [`Hedges of ${formatWithCode({ minor: e.hedged, currency: e.currency }, { compact: true })} cover ${pct}% of ${formatWithCode(net, { compact: true })}.`],
        evidence: [{ type: "fx", id: `${e.currency}/USD`, label: `${e.currency}/USD rate` }],
        confidence: 0.8,
        recommendation: { action: "review", label: "Review hedge position" },
        status: "open",
        createdAt: now,
      });
    }
  }

  const inBand = exposures.filter((e) => e.ratio >= HEDGE_POLICY.min && e.ratio <= HEDGE_POLICY.max).length;
  return {
    id: `run-fx_exposure-${now}`,
    agentId: "fx_exposure",
    startedAt: now,
    finishedAt: now,
    inputs: `${exposures.length} currencies, ${snapshot.hedges.length} hedges`,
    steps: [
      { label: "Exposure", detail: `Netted receivables and payables for ${exposures.length} currencies over 90 days`, durationMs: 150, status: "done" },
      { label: "Hedges", detail: `Matched ${snapshot.hedges.length} hedges maturing in the window`, durationMs: 110, status: "done" },
      { label: "Policy check", detail: `${inBand} of ${exposures.length} currencies inside the 60% to 80% band`, durationMs: 60, status: inBand === exposures.length ? "done" : "warning" },
      { label: "Pricing", detail: "Priced forwards at the current rate plus a fixed spread (indicative)", durationMs: 80, status: "done" },
    ],
    findings,
  };
}
