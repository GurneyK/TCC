import { beforeEach, describe, expect, it } from "vitest";
import { SCENARIOS } from "@/data/scenarios";
import { approvalBlock } from "@/lib/approvals";
import { parseStatement } from "@/lib/csv";
import { PERSONAS } from "@/data/world";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useTreasury } from "./useTreasury";

const st = () => useTreasury.getState();
const payment = (id: string) => st().data.payments.find((p) => p.id === id)!;
const finding = (id: string) => st().findings.find((f) => f.id === id);

beforeEach(() => st().reset());

describe("maker checker", () => {
  it("never lets an analyst approve", () => {
    const p = st().data.payments.find((x) => x.status === "pending_approval")!;
    expect(approvalBlock(p, { name: PERSONAS.analyst.name, role: "analyst" }, st().findings)).toMatch(/Group Treasurer/);
    expect(st().approvePayment(p.id, "").ok).toBe(false);
  });

  it("blocks approving your own payment", () => {
    st().setRole("treasurer");
    const own = st().data.payments.find((x) => x.status === "pending_approval" && x.createdBy === PERSONAS.treasurer.name && !finding(`pr-${x.id}`))!;
    expect(own).toBeTruthy();
    const r = st().approvePayment(own.id, "ok");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/second person/);
  });

  it("blocks approval while a critical finding is open", () => {
    st().setRole("treasurer");
    const r = st().approvePayment(SCENARIOS.S1.paymentId, "");
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/critical/);
    expect(payment(SCENARIOS.S1.paymentId).status).toBe("pending_approval");
  });

  it("auditors cannot act on findings", () => {
    st().setRole("auditor");
    expect(st().acceptFinding(`pr-${SCENARIOS.S3.paymentId}`).ok).toBe(false);
  });

  it("approves a clean payment from someone else and logs it", () => {
    st().setRole("treasurer");
    const clean = st().data.payments.find(
      (x) => x.status === "pending_approval" && x.createdBy !== PERSONAS.treasurer.name && !finding(`pr-${x.id}`),
    )!;
    expect(st().approvePayment(clean.id, "Looks right").ok).toBe(true);
    expect(payment(clean.id).status).toBe("approved");
    expect(st().audit.at(-1)?.action).toBe("Approved payment");
  });
});

describe("S1 end to end", () => {
  it("callback not confirmed auto rejects the payment with an audit trail", () => {
    const id = `pr-${SCENARIOS.S1.paymentId}`;
    expect(finding(id)?.severity).toBe("critical");
    st().verifyCallback(id, false, "Supplier did not recognise the change.");
    expect(payment(SCENARIOS.S1.paymentId).status).toBe("rejected");
    expect(finding(id)?.status).toBe("accepted");
    const actions = st().audit.filter((e) => e.target.id === id || e.target.id === SCENARIOS.S1.paymentId).map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(["Raised finding", "Recorded callback: not confirmed", "Auto rejected payment"]));
  });
});

describe("findings", () => {
  it("S4 accept books a partial match and a deduction case", () => {
    const f = st().findings.find((x) => x.id.startsWith("rc-short") && x.title.includes(SCENARIOS.S4.customer))!;
    expect(st().acceptFinding(f.id).message).toMatch(/Deduction case/);
    const inv = st().data.invoices.find((i) => i.number === SCENARIOS.S4.invoiceNumber)!;
    expect(inv.status).toBe("partially_paid");
  });

  it("S6 accept creates a draft that a treasurer can approve after submission", () => {
    const f = st().findings.find((x) => x.id.startsWith(`cf-${SCENARIOS.S6.entityId}`))!;
    const r = st().acceptFinding(f.id);
    expect(r.paymentId).toBeTruthy();
    expect(payment(r.paymentId!).status).toBe("draft");
    expect(st().submitPayment(r.paymentId!).ok).toBe(true);
    st().setRole("treasurer");
    expect(st().approvePayment(r.paymentId!, "Funding Brazil").ok).toBe(true);
    // Brazil no longer breaches once the funding is in the forecast.
    expect(st().runs.cash_forecast.findings.some((x) => x.id.startsWith(`cf-${SCENARIOS.S6.entityId}`))).toBe(false);
  });

  it("S7 accept raises a hedge request a different person books", () => {
    st().acceptFinding("fx-EUR-under");
    const req = st().hedgeRequests[0];
    expect(req.currency).toBe("EUR");
    st().setRole("treasurer");
    expect(st().bookHedge(req.id).ok).toBe(true);
    expect(st().runs.fx_exposure.findings.some((x) => x.id === "fx-EUR-under")).toBe(false);
  });

  it("dismiss needs a reason", () => {
    const f = st().findings.find((x) => x.status === "open")!;
    st().dismissFinding(f.id, "  ");
    expect(finding(f.id)?.status).toBe("open");
    st().dismissFinding(f.id, "Known timing difference");
    expect(finding(f.id)?.status).toBe("dismissed");
  });
});

describe("sources and uploads", () => {
  it("retry sync clears the S8 stale feed", () => {
    st().retrySync(SCENARIOS.S8.sourceId);
    const src = st().data.sources.find((s) => s.id === SCENARIOS.S8.sourceId)!;
    expect(src.lastSyncAt).toBe(st().now);
  });

  it("imports the sample Crestwood statement and reconciles it", () => {
    const csv = readFileSync(resolve(__dirname, "../../public/samples/crestwood-statement.csv"), "utf8");
    const parsed = parseStatement(csv, st().data.accounts);
    expect(parsed.headerError).toBeNull();
    expect(parsed.rows.filter((r) => r.errors.length)).toHaveLength(0);
    const summary = st().importStatement(parsed.rows, "crestwood-statement.csv");
    expect(summary).toMatchObject({ imported: 20, matched: 15, fees: 3, exceptions: 2 });
  });
});

describe("live feed", () => {
  it("ticks deterministically and reconciles new lines", () => {
    const before = st().data.transactions.length;
    for (let i = 0; i < 31; i += 1) st().tick();
    const added = st().data.transactions.length - before;
    expect(added).toBeGreaterThan(5);
    expect(st().runs["recon:live"]).toBeTruthy();
    const ids = st().data.transactions.slice(before).map((t) => t.id);
    st().reset();
    for (let i = 0; i < 31; i += 1) st().tick();
    expect(st().data.transactions.slice(before).map((t) => t.id)).toEqual(ids);
  });

  it("pause stops the clock", () => {
    st().setPaused(true);
    const now = st().now;
    st().tick();
    expect(st().now).toBe(now);
  });
});
