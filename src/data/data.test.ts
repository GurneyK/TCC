import { describe, expect, it } from "vitest";
import { runCashForecast, computeForecast } from "@/agents/cashForecast";
import { runFxExposure } from "@/agents/fxExposure";
import { runPaymentRisk } from "@/agents/paymentRisk";
import { runReconciliation } from "@/agents/reconciliation";
import { sourceStatus } from "@/lib/freshness";
import { toUsd } from "@/lib/money";
import { generateData } from "./generator";
import { SCENARIOS } from "./scenarios";
import type { TreasurySnapshot } from "./types";
import { DEMO_START } from "./world";

const snapshot = (): TreasurySnapshot => ({ ...generateData(), now: DEMO_START });

describe("generator", () => {
  it("is deterministic for the same seed", () => {
    expect(JSON.stringify(generateData(42))).toEqual(JSON.stringify(generateData(42)));
  });

  it("produces data at the target sizes", () => {
    const d = generateData();
    expect(d.entities).toHaveLength(12);
    expect(d.banks).toHaveLength(5);
    expect(d.accounts.length).toBeGreaterThanOrEqual(28);
    expect(d.sources).toHaveLength(8);
    expect(d.counterparties.filter((c) => c.kind === "customer")).toHaveLength(40);
    expect(d.counterparties.filter((c) => c.kind === "supplier")).toHaveLength(180);
    expect(d.transactions.length).toBeGreaterThan(1800);
    expect(d.invoices.length).toBeGreaterThan(1150);
    expect(d.payments.length).toBeGreaterThanOrEqual(55);
    const pending = d.payments.filter((p) => p.status === "pending_approval").length;
    expect(pending).toBeGreaterThanOrEqual(15);
    expect(pending).toBeLessThanOrEqual(20);
  });

  it("lands total cash between USD 4 and 5 billion", () => {
    const d = generateData();
    const total = d.accounts.reduce((s, a) => s + toUsd(a.balance, d.rates).minor, 0) / 100;
    expect(total).toBeGreaterThan(4e9);
    expect(total).toBeLessThan(5e9);
  });

  it("never produces fractional minor units", () => {
    const d = generateData();
    const all = [...d.accounts.map((a) => a.balance), ...d.transactions.map((t) => t.amount), ...d.invoices.map((i) => i.amount), ...d.payments.map((p) => p.amount), ...d.hedges.map((h) => h.notional)];
    expect(all.every((m) => Number.isInteger(m.minor))).toBe(true);
  });

  it("never stores a full account number", () => {
    const d = generateData();
    expect(d.accounts.every((a) => /^•••• \d{4}$/.test(a.maskedNumber))).toBe(true);
  });
});

describe("planted scenarios", () => {
  it("S1: Payment Risk holds Orchard for a callback", () => {
    const run = runPaymentRisk(snapshot(), DEMO_START);
    const f = run.findings.find((x) => x.id === `pr-${SCENARIOS.S1.paymentId}`);
    expect(f?.severity).toBe("critical");
    expect(f?.recommendation.action).toBe("verify_callback");
  });

  it("S2: Payment Risk flags the Bluewave duplicate", () => {
    const run = runPaymentRisk(snapshot(), DEMO_START);
    const f = run.findings.find((x) => x.id === `pr-${SCENARIOS.S2.paymentIds[1]}`);
    expect(f?.severity).toBe("high");
    expect(f?.title).toMatch(/duplicate/i);
  });

  it("S3: Payment Risk blocks the Kestral near match", () => {
    const run = runPaymentRisk(snapshot(), DEMO_START);
    const f = run.findings.find((x) => x.id === `pr-${SCENARIOS.S3.paymentId}`);
    expect(f?.severity).toBe("critical");
    expect(f?.evidence.some((e) => e.type === "watchlist")).toBe(true);
  });

  it("only the planted payments carry high or critical risk", () => {
    const run = runPaymentRisk(snapshot(), DEMO_START);
    const serious = run.findings.filter((f) => f.severity === "high" || f.severity === "critical").map((f) => f.id).sort();
    expect(serious).toEqual([`pr-${SCENARIOS.S1.paymentId}`, `pr-${SCENARIOS.S2.paymentIds[1]}`, `pr-${SCENARIOS.S3.paymentId}`].sort());
  });

  it("S4: Reconciliation catches the Brightmart short pay", () => {
    const run = runReconciliation(snapshot(), DEMO_START);
    const f = run.findings.find((x) => x.id === `rc-short-${SCENARIOS.S4.transactionId}`);
    expect(f?.severity).toBe("medium");
    expect(f?.title).toContain("4.6%");
    expect(f?.recommendation.action).toBe("open_deduction_case");
  });

  it("S5: Reconciliation groups 14 fee lines", () => {
    const run = runReconciliation(snapshot(), DEMO_START);
    const f = run.findings.find((x) => x.id.startsWith("rc-fees-"));
    expect(f?.severity).toBe("low");
    expect(f?.title).toContain(String(SCENARIOS.S5.count));
  });

  it("S6: Cash Forecast flags Brasil in week 6", () => {
    const s = snapshot();
    const brasil = computeForecast(s).find((f) => f.entityId === SCENARIOS.S6.entityId);
    expect(brasil?.firstBreachWeek).toBe(SCENARIOS.S6.breachWeek);
    const run = runCashForecast(s, DEMO_START);
    expect(run.findings.map((f) => f.id)).toEqual([`cf-${SCENARIOS.S6.entityId}-w${SCENARIOS.S6.breachWeek}`]);
    expect(run.findings[0].recommendation.amount?.currency).toBe("BRL");
  });

  it("S7: FX Exposure flags EUR at 48%", () => {
    const run = runFxExposure(snapshot(), DEMO_START);
    expect(run.findings.map((f) => f.id)).toEqual(["fx-EUR-under"]);
    expect(run.findings[0].title).toContain("48%");
  });

  it("S8: Crestwood Trust feed is delayed", () => {
    const s = snapshot();
    const delayed = s.sources.filter((src) => sourceStatus(src, DEMO_START) === "delayed").map((src) => src.id);
    expect(delayed).toEqual([SCENARIOS.S8.sourceId]);
  });

  it("reconciliation trace counts look like the brief", () => {
    const run = runReconciliation(snapshot(), DEMO_START);
    console.info(run.steps.map((s) => s.detail).join(" | "));
    expect(run.steps[1].detail).toMatch(/Exact reference matches: \d+/);
  });
});
