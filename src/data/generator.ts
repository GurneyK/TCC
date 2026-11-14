import { addDays, addMinutes, daysBetween, isoDate } from "@/lib/dates";
import { computeExposures } from "@/lib/exposure";
import { buildPaymentHistory } from "@/lib/paymentHistory";
import { createRng, type Rng } from "./rng";
import { CSV_INVOICES, PINNED_HOME, SCENARIOS } from "./scenarios";
import type {
  BankAccount,
  Counterparty,
  CurrencyCode,
  DataSource,
  Entity,
  FxRate,
  Hedge,
  Invoice,
  Payment,
  Transaction,
  TreasuryData,
  WatchlistEntry,
} from "./types";
import watchlistJson from "./watchlist.json";
import {
  ACCOUNT_SEEDS,
  BANKS,
  BASE_RATES,
  CUSTOMER_NAMES,
  DEFAULT_SEED,
  DEMO_START,
  ENTITIES,
  PERSONAS,
  supplierNames,
  TREASURY_CENTRE_ID,
} from "./world";

const OPERATING = ENTITIES.filter((e) => e.id !== TREASURY_CENTRE_ID);
const FEED_FORMATS: Record<string, string> = {
  "bank-harborline": "camt.053",
  "bank-northgate": "MT940",
  "bank-crestwood": "MT940",
  "bank-pacific": "camt.053",
  "bank-alder": "camt.053",
};

const minor = (major: number) => Math.round(major) * 100;
const last4 = (rng: Rng) => String(rng.int(1000, 9999));

export function sourceIdForBank(bankId: string) {
  return `src-${bankId.replace("bank-", "")}`;
}

function buildSources(rng: Rng, now: string): DataSource[] {
  const feeds: DataSource[] = BANKS.map((bank) => ({
    id: sourceIdForBank(bank.id),
    name: `${bank.name} feed`,
    type: "bank_feed",
    format: FEED_FORMATS[bank.id],
    status: "healthy",
    lastSyncAt: addMinutes(now, -rng.int(2, 12)),
    slaMinutes: 60,
    recordsToday: rng.int(180, 640),
  }));
  return [
    ...feeds,
    { id: "src-erp", name: "ERP ledger", type: "erp", format: "SAP extract", status: "healthy", lastSyncAt: addMinutes(now, -38), slaMinutes: 240, recordsToday: 1_284 },
    { id: "src-fx", name: "FX market data", type: "market_data", format: "Rates API (JSON)", status: "healthy", lastSyncAt: addMinutes(now, -3), slaMinutes: 15, recordsToday: 3_456 },
    { id: "src-watchlist", name: "Sanctions watchlist", type: "watchlist", format: "JSON list", status: "healthy", lastSyncAt: addMinutes(now, -360), slaMinutes: 1_440, recordsToday: 6 },
  ];
}

function buildAccounts(rng: Rng): BankAccount[] {
  return ACCOUNT_SEEDS.map(([entityId, bankId, type, balanceMajor, fixedLast4], i) => {
    const entity = ENTITIES.find((e) => e.id === entityId) as Entity;
    const balance = minor(balanceMajor);
    const held = Math.round(balance * rng.between(0.005, 0.03));
    return {
      id: `acc-${String(i + 1).padStart(2, "0")}`,
      bankId,
      entityId,
      currency: entity.currency,
      type,
      maskedNumber: `•••• ${fixedLast4 ?? last4(rng)}`,
      balance: { minor: balance, currency: entity.currency },
      availableBalance: { minor: balance - held, currency: entity.currency },
      sourceId: sourceIdForBank(bankId),
    };
  });
}

function buildCounterparties(rng: Rng, today: string): Counterparty[] {
  const customers: Counterparty[] = CUSTOMER_NAMES.map((name, i) => {
    const home = ENTITIES.find((e) => e.id === (PINNED_HOME[name] ?? OPERATING[i % OPERATING.length].id)) as Entity;
    return { id: `cus-${String(i + 1).padStart(3, "0")}`, name, kind: "customer", country: home.country, avgDaysLate: rng.int(0, 16) };
  });
  const suppliers: Counterparty[] = supplierNames().map((name, i) => {
    const home = ENTITIES.find((e) => e.id === (PINNED_HOME[name] ?? OPERATING[i % OPERATING.length].id)) as Entity;
    return {
      id: `sup-${String(i + 1).padStart(3, "0")}`,
      name,
      kind: "supplier",
      country: home.country,
      maskedBankAccount: `•••• ${last4(rng)}`,
      bankDetailsChangedAt: addDays(today, -rng.int(120, 420)),
    };
  });
  return [...customers, ...suppliers];
}

/** Which entity a counterparty trades with. */
export function homeEntityId(cp: Counterparty): string {
  return PINNED_HOME[cp.name] ?? (ENTITIES.find((e) => e.country === cp.country && e.id !== TREASURY_CENTRE_ID)?.id as string);
}

function entityScale(accounts: BankAccount[], entityId: string) {
  return accounts.filter((a) => a.entityId === entityId).reduce((s, a) => s + a.balance.minor, 0) / 100;
}

function accountFor(accounts: BankAccount[], entityId: string, prefer: BankAccount["type"][]) {
  for (const type of prefer) {
    const found = accounts.find((a) => a.entityId === entityId && a.type === type);
    if (found) return found;
  }
  return accounts.find((a) => a.entityId === entityId) as BankAccount;
}

export function generateData(seed: number = DEFAULT_SEED, now: string = DEMO_START): TreasuryData {
  const rng = createRng(seed);
  const today = isoDate(now);
  const sources = buildSources(rng, now);
  const accounts = buildAccounts(rng);
  const counterparties = buildCounterparties(rng, today);
  const cpByName = new Map(counterparties.map((c) => [c.name, c]));
  const invoices: Invoice[] = [];
  const transactions: Transaction[] = [];
  let txSeq = 0;
  const txId = () => `tx-${String(++txSeq).padStart(5, "0")}`;

  const pushTx = (t: Omit<Transaction, "id" | "bookedAt"> & { id?: string; bookedAt?: string }) => {
    transactions.push({ ...t, id: t.id ?? txId(), bookedAt: t.bookedAt ?? `${t.valueDate}T${String(rng.int(7, 17)).padStart(2, "0")}:${String(rng.int(0, 59)).padStart(2, "0")}:00.000Z` });
  };

  // Invoices and the bank transactions that settled them.
  let arNo = 60100;
  let apNo = 30100;
  for (const entity of OPERATING) {
    const scale = entityScale(accounts, entity.id);
    const avg = scale * 0.006;
    const customers = counterparties.filter((c) => c.kind === "customer" && homeEntityId(c) === entity.id);
    const suppliers = counterparties.filter((c) => c.kind === "supplier" && homeEntityId(c) === entity.id && c.name !== SCENARIOS.S3.counterparty);
    for (let i = 0; i < 109; i += 1) {
      const isAr = rng.chance(0.45);
      const cp = rng.pick(isAr ? customers : suppliers);
      const issue = addDays(today, -rng.int(0, 100));
      const due = addDays(issue, rng.pick([30, 45, 60, 90]));
      const amount = minor(avg * (isAr ? 1.35 : 1) * rng.between(0.3, 1.7));
      const number = isAr ? `AR-${(arNo += rng.int(1, 3))}` : `INV-${(apNo += rng.int(1, 3))}`;
      const overdueBy = daysBetween(due, today);
      let status: Invoice["status"] = "open";
      if (overdueBy > 5) status = rng.chance(0.93) ? "paid" : rng.chance(0.5) ? "disputed" : "open";
      const inv: Invoice = {
        id: `inv-${number.toLowerCase()}`,
        number,
        kind: isAr ? "AR" : "AP",
        entityId: entity.id,
        counterpartyId: cp.id,
        amount: { minor: amount, currency: entity.currency },
        issueDate: issue,
        dueDate: due,
        status,
      };
      invoices.push(inv);

      if (status === "paid") {
        const late = isAr ? (cp.avgDaysLate ?? 0) : -rng.int(0, 3);
        let paidOn = addDays(due, late);
        if (daysBetween(paidOn, today) < 4) paidOn = addDays(today, -4);
        if (daysBetween(paidOn, today) <= 90) {
          const acct = accountFor(accounts, entity.id, isAr ? ["collections", "operating"] : ["operating"]);
          pushTx({
            accountId: acct.id,
            valueDate: paidOn,
            amount: inv.amount,
            direction: isAr ? "in" : "out",
            counterparty: cp.name,
            reference: `${isAr ? "REMIT" : "PMT"} ${number}`,
            status: "matched",
            matchedInvoiceIds: [inv.id],
          });
        }
      }
    }
  }

  // Routine flows: payroll, weekly sweeps, monthly account fees, day to day operating debits.
  const tc = accountFor(accounts, TREASURY_CENTRE_ID, ["concentration"]);
  for (const entity of OPERATING) {
    const scale = entityScale(accounts, entity.id);
    const payrollAcct = accountFor(accounts, entity.id, ["payroll", "operating"]);
    const opAcct = accountFor(accounts, entity.id, ["operating"]);
    for (let d = 88; d >= 4; d -= 14) {
      pushTx({ accountId: payrollAcct.id, valueDate: addDays(today, -d), amount: { minor: minor(scale * 0.01), currency: entity.currency }, direction: "out", counterparty: "Payroll", reference: "PAYROLL RUN", status: "matched" });
    }
    for (let d = 87; d >= 4; d -= 7) {
      const amt = minor(scale * rng.between(0.004, 0.012));
      pushTx({ accountId: opAcct.id, valueDate: addDays(today, -d), amount: { minor: amt, currency: entity.currency }, direction: "out", counterparty: "Lumen Treasury Centre B.V.", reference: "CASH SWEEP TO TC", status: "matched" });
      pushTx({ accountId: tc.id, valueDate: addDays(today, -d), amount: { minor: Math.round((amt * BASE_RATES[entity.currency]) / BASE_RATES.EUR), currency: "EUR" }, direction: "in", counterparty: entity.name, reference: "CASH SWEEP FROM ENTITY", status: "matched" });
    }
  }
  for (const acct of accounts) {
    const bank = BANKS.find((b) => b.id === acct.bankId);
    for (let d = 85; d >= 25; d -= 30) {
      pushTx({ accountId: acct.id, valueDate: addDays(today, -d), amount: { minor: minor(rng.int(40, 900) / BASE_RATES[acct.currency]), currency: acct.currency }, direction: "out", counterparty: bank?.name ?? "Bank", reference: "FEE MONTHLY MAINTENANCE", status: "matched" });
    }
  }
  const miscRefs = ["UTILITIES", "RENT", "CARD SETTLEMENT", "TRAVEL", "INSURANCE PREMIUM", "SOFTWARE LICENSE", "COURIER"];
  for (let d = 90; d >= 4; d -= 1) {
    for (let k = 0; k < 11; k += 1) {
      const entity = OPERATING[k];
      const acct = accountFor(accounts, entity.id, ["operating"]);
      pushTx({ accountId: acct.id, valueDate: addDays(today, -d), amount: { minor: minor(entityScale(accounts, entity.id) * rng.between(0.00005, 0.0006)), currency: entity.currency }, direction: "out", counterparty: rng.pick(miscRefs), reference: rng.pick(miscRefs), status: "matched" });
    }
  }

  plantInvoices(invoices, counterparties, cpByName, today);
  plantRecentPool(rng, invoices, accounts, counterparties, cpByName, today, pushTx);

  const rates: FxRate[] = (Object.keys(BASE_RATES) as CurrencyCode[])
    .filter((c) => c !== "USD")
    .map((c) => ({ pair: `${c}/USD` as const, rate: BASE_RATES[c], updatedAt: addMinutes(now, -3) }));

  const hedges = buildHedges(rng, invoices, today);
  const payments = buildPayments(rng, invoices, transactions, accounts, counterparties, cpByName, now);

  // S1: Orchard changed its bank details two days ago.
  const orchard = cpByName.get(SCENARIOS.S1.counterparty) as Counterparty;
  orchard.bankDetailsChangedAt = addDays(today, -SCENARIOS.S1.changedDaysAgo);
  orchard.maskedBankAccount = "•••• 0912";
  // S8: Crestwood Trust feed is 26 hours stale.
  const crestwood = sources.find((s) => s.id === SCENARIOS.S8.sourceId) as DataSource;
  crestwood.lastSyncAt = addMinutes(now, -SCENARIOS.S8.staleHours * 60);
  crestwood.recordsToday = 0;

  transactions.sort((a, b) => a.bookedAt.localeCompare(b.bookedAt));

  return {
    entities: ENTITIES.map((e) => ({ ...e })),
    banks: BANKS.map((b) => ({ ...b })),
    accounts,
    transactions,
    invoices,
    counterparties,
    payments,
    rates,
    hedges,
    sources,
    watchlist: watchlistJson as WatchlistEntry[],
  };
}

function plantInvoices(invoices: Invoice[], counterparties: Counterparty[], cpByName: Map<string, Counterparty>, today: string) {
  const add = (number: string, kind: Invoice["kind"], entityId: string, cpName: string, major: number, dueInDays: number, issuedDaysAgo = 30) => {
    const entity = ENTITIES.find((e) => e.id === entityId) as Entity;
    const cp = cpByName.get(cpName) as Counterparty;
    invoices.push({
      id: `inv-${number.toLowerCase()}`,
      number,
      kind,
      entityId,
      counterpartyId: cp.id,
      amount: { minor: minor(major), currency: entity.currency },
      issueDate: addDays(today, -issuedDaysAgo),
      dueDate: addDays(today, dueInDays),
      status: "open",
    });
  };
  const s = SCENARIOS;
  add(s.S1.invoiceNumber, "AP", s.S1.entityId, s.S1.counterparty, s.S1.amountMajor, 3);
  add(s.S2.invoiceNumbers[0], "AP", s.S2.entityId, s.S2.counterparty, s.S2.amountMajor, 1);
  add(s.S2.invoiceNumbers[1], "AP", s.S2.entityId, s.S2.counterparty, s.S2.amountMajor, 4, 25);
  add(s.S3.invoiceNumber, "AP", s.S3.entityId, s.S3.counterparty, s.S3.amountMajor, 3);
  add(s.S4.invoiceNumber, "AR", s.S4.entityId, s.S4.customer, s.S4.invoiceMajor, -3, 33);
  for (const i of s.S6.invoices) add(i.number, "AP", s.S6.entityId, s.S6.supplier, i.major, i.dueInDays, 10);
  for (const i of CSV_INVOICES) add(i.number, "AR", "ent-uk", i.customer, i.major, i.dueInDays, 40);
  void counterparties;
}

type PushTx = (t: Omit<Transaction, "id" | "bookedAt"> & { id?: string; bookedAt?: string }) => void;

/** Recent unmatched bank lines: the Reconciliation agent's work queue. */
function plantRecentPool(
  rng: Rng,
  invoices: Invoice[],
  accounts: BankAccount[],
  counterparties: Counterparty[],
  cpByName: Map<string, Counterparty>,
  today: string,
  pushTx: PushTx,
) {
  const cpById = new Map(counterparties.map((c) => [c.id, c]));
  const reserved = new Set<string>([SCENARIOS.S4.invoiceNumber, ...CSV_INVOICES.map((i) => i.number)]);
  const candidates = invoices.filter((inv) => inv.kind === "AR" && inv.status === "open" && !reserved.has(inv.number));

  const near = candidates.filter((inv) => Math.abs(daysBetween(today, inv.dueDate)) <= 3);
  const used = new Set<string>();

  // Strong matches: right customer and amount within 0.5%, no invoice number in the reference.
  for (const inv of near.slice(0, 26)) {
    used.add(inv.id);
    const acct = accountFor(accounts, inv.entityId, ["collections", "operating"]);
    pushTx({ accountId: acct.id, valueDate: addDays(today, -rng.int(0, 1)), amount: { minor: Math.round(inv.amount.minor * (1 - rng.between(0.0005, 0.004))), currency: inv.amount.currency }, direction: "in", counterparty: cpById.get(inv.counterpartyId)?.name ?? "", reference: "PAYMENT RECEIVED THANK YOU", status: "unmatched" });
  }

  // Exact matches: amount equal and the reference quotes the invoice number.
  const exact = candidates.filter((inv) => !used.has(inv.id) && daysBetween(today, inv.dueDate) >= -25 && daysBetween(today, inv.dueDate) <= 12).slice(0, 171);
  for (const inv of exact) {
    used.add(inv.id);
    const acct = accountFor(accounts, inv.entityId, ["collections", "operating"]);
    pushTx({ accountId: acct.id, valueDate: addDays(today, -rng.int(0, 2)), amount: inv.amount, direction: "in", counterparty: cpById.get(inv.counterpartyId)?.name ?? "", reference: `REMIT ${inv.number}`, status: "unmatched" });
  }

  // Short pays. S4 is Brightmart at 4.6%. Two more at 2.1% and 6.3%.
  const s4 = invoices.find((i) => i.number === SCENARIOS.S4.invoiceNumber) as Invoice;
  const s4acct = accountFor(accounts, s4.entityId, ["collections", "operating"]);
  pushTx({ id: SCENARIOS.S4.transactionId, accountId: s4acct.id, valueDate: addDays(today, -1), amount: { minor: Math.round(s4.amount.minor * (1 - SCENARIOS.S4.shortPct)), currency: s4.amount.currency }, direction: "in", counterparty: SCENARIOS.S4.customer, reference: `BRIGHTMART REMIT ${s4.number} LESS PROMO DEDUCTION`, status: "unmatched" });
  const shortPool = candidates.filter((inv) => !used.has(inv.id) && daysBetween(today, inv.dueDate) < 0 && cpById.get(inv.counterpartyId)?.name !== SCENARIOS.S4.customer).slice(0, 2);
  [0.021, 0.063].forEach((pct, i) => {
    const inv = shortPool[i];
    if (!inv) return;
    used.add(inv.id);
    const acct = accountFor(accounts, inv.entityId, ["collections", "operating"]);
    pushTx({ accountId: acct.id, valueDate: addDays(today, -1), amount: { minor: Math.round(inv.amount.minor * (1 - pct)), currency: inv.amount.currency }, direction: "in", counterparty: cpById.get(inv.counterpartyId)?.name ?? "", reference: `REMITTANCE ${inv.number} NET OF DEDUCTIONS`, status: "unmatched" });
  });

  // S5: fourteen small bank fee debits.
  const feeRefs = ["FEE WIRE OUT", "CHG INTL TRANSFER", "FEE ACCOUNT ANALYSIS", "CHG SWIFT MESSAGE", "FEE CASH MGMT"];
  for (let i = 0; i < SCENARIOS.S5.count; i += 1) {
    const acct = accounts[(i * 5) % accounts.length];
    const bank = acct.bankId.replace("bank-", "");
    pushTx({ accountId: acct.id, valueDate: addDays(today, -rng.int(0, 2)), amount: { minor: minor(rng.int(12, 480) / BASE_RATES[acct.currency]), currency: acct.currency }, direction: "out", counterparty: `${bank.charAt(0).toUpperCase()}${bank.slice(1)} charges`, reference: feeRefs[i % feeRefs.length], status: "unmatched" });
  }

  // Lines nobody can explain, older than three days.
  const unknown = ["UNKNOWN REMITTER", "TRF 88213 REF N/A", "INWARD CREDIT", "RTN ITEM", "ACH CREDIT BATCH"];
  for (let i = 0; i < 8; i += 1) {
    const acct = accounts[(i * 7 + 3) % accounts.length];
    const inbound = i % 3 !== 0;
    pushTx({ accountId: acct.id, valueDate: addDays(today, -rng.int(4, 9)), amount: { minor: minor(rng.int(3_000, 95_000) / BASE_RATES[acct.currency]) + rng.int(1, 99), currency: acct.currency }, direction: inbound ? "in" : "out", counterparty: rng.pick(unknown), reference: `${rng.pick(unknown)} ${rng.int(100000, 999999)}`, status: "unmatched" });
  }
  void cpByName;
}

function buildHedges(rng: Rng, invoices: Invoice[], today: string): Hedge[] {
  const exposures = computeExposures(invoices, [], today);
  const hedges: Hedge[] = [];
  const bankIds = BANKS.map((b) => b.id);
  let n = 0;
  for (const e of exposures) {
    if (e.net === 0) continue;
    const target = e.currency === SCENARIOS.S7.currency ? SCENARIOS.S7.ratio : rng.between(0.62, 0.78);
    const total = Math.round(Math.abs(e.net) * target);
    const count = rng.int(2, 4);
    let remaining = total;
    for (let i = 0; i < count; i += 1) {
      const part = i === count - 1 ? remaining : Math.round(total / count);
      remaining -= part;
      hedges.push({
        id: `hdg-${String(++n).padStart(3, "0")}`,
        currency: e.currency,
        notional: { minor: part, currency: e.currency },
        rate: Number((BASE_RATES[e.currency] * rng.between(0.993, 1.007)).toFixed(5)),
        tradeDate: addDays(today, -rng.int(10, 60)),
        maturityDate: addDays(today, rng.int(8, 86)),
        bankId: rng.pick(bankIds),
      });
    }
  }
  return hedges;
}

function buildPayments(
  rng: Rng,
  invoices: Invoice[],
  transactions: Transaction[],
  accounts: BankAccount[],
  counterparties: Counterparty[],
  cpByName: Map<string, Counterparty>,
  now: string,
): Payment[] {
  const today = isoDate(now);
  const history = buildPaymentHistory(transactions, accounts, today);
  const cpById = new Map(counterparties.map((c) => [c.id, c]));
  const priya = PERSONAS.analyst.name;
  const daniel = PERSONAS.treasurer.name;
  const payments: Payment[] = [];
  const usedCp = new Set<string>();
  const planted = new Set<string>([
    SCENARIOS.S1.invoiceNumber, ...SCENARIOS.S2.invoiceNumbers, SCENARIOS.S3.invoiceNumber,
    ...SCENARIOS.S6.invoices.map((i) => i.number),
  ]);

  const make = (inv: Invoice, status: Payment["status"], extra: Partial<Payment> = {}): Payment => {
    const acct = accountFor(accounts, inv.entityId, ["operating"]);
    return {
      id: extra.id ?? `pay-${String(payments.length + 1).padStart(3, "0")}`,
      entityId: inv.entityId,
      fromAccountId: acct.id,
      counterpartyId: inv.counterpartyId,
      invoiceIds: [inv.id],
      amount: inv.amount,
      valueDate: extra.valueDate ?? addDays(today, rng.int(1, 5)),
      kind: "supplier",
      status,
      createdBy: extra.createdBy ?? priya,
      createdAt: extra.createdAt ?? addMinutes(now, -rng.int(30, 60 * 20)),
      linkedFindingIds: [],
      ...extra,
    };
  };

  /** A clean payment: known counterparty, paid from its usual entity, normal size. */
  const clean = (inv: Invoice) => {
    const cp = cpById.get(inv.counterpartyId);
    if (!cp || usedCp.has(cp.id) || planted.has(inv.number)) return false;
    const h = history.get(cp.name);
    if (!h || !h.entityIds.has(inv.entityId)) return false;
    return inv.amount.minor <= h.medianMinor * 2;
  };

  const openAp = invoices.filter((i) => i.kind === "AP" && i.status === "open");
  const take = (filter: (i: Invoice) => boolean, count: number) => {
    const picked: Invoice[] = [];
    for (const inv of openAp) {
      if (picked.length >= count) break;
      if (filter(inv) && clean(inv)) {
        picked.push(inv);
        usedCp.add(inv.counterpartyId);
      }
    }
    return picked;
  };
  const dueIn = (min: number, max: number) => (i: Invoice) => {
    const d = daysBetween(today, i.dueDate);
    return d >= min && d <= max;
  };

  // Planted pending payments.
  const byNumber = (n: string) => invoices.find((i) => i.number === n) as Invoice;
  payments.push(make(byNumber(SCENARIOS.S1.invoiceNumber), "pending_approval", { id: SCENARIOS.S1.paymentId, valueDate: addDays(today, 1), createdAt: addMinutes(now, -95) }));
  payments.push(make(byNumber(SCENARIOS.S2.invoiceNumbers[0]), "approved", { id: SCENARIOS.S2.paymentIds[0], valueDate: addDays(today, 1), createdAt: addMinutes(now, -60 * 24 * 3), approvedBy: daniel }));
  payments.push(make(byNumber(SCENARIOS.S2.invoiceNumbers[1]), "pending_approval", { id: SCENARIOS.S2.paymentIds[1], valueDate: addDays(today, 3), createdAt: addMinutes(now, -140) }));
  payments.push(make(byNumber(SCENARIOS.S3.invoiceNumber), "pending_approval", { id: SCENARIOS.S3.paymentId, valueDate: addDays(today, 2), createdAt: addMinutes(now, -210) }));
  [SCENARIOS.S1.counterparty, SCENARIOS.S2.counterparty, SCENARIOS.S3.counterparty].forEach((n) => usedCp.add((cpByName.get(n) as Counterparty).id));

  take(dueIn(0, 9), 15).forEach((inv, i) => payments.push(make(inv, "pending_approval", { createdBy: i % 5 === 4 ? daniel : priya })));
  take(dueIn(0, 6), 6).forEach((inv) => payments.push(make(inv, "approved", { approvedBy: daniel })));
  take(dueIn(5, 14), 6).forEach((inv) => payments.push(make(inv, "draft", { valueDate: addDays(today, rng.int(6, 12)) })));
  take(dueIn(0, 12), 4).forEach((inv, i) =>
    payments.push(make(inv, "rejected", { approvedBy: daniel, rejectedReason: ["Invoice under dispute with supplier", "Wrong paying entity", "Amount does not match goods received", "Hold until credit note arrives"][i] })),
  );

  // Settled history: released and acknowledged payments against recently paid invoices.
  const paidRecent = invoices.filter((i) => i.kind === "AP" && i.status === "paid" && daysBetween(i.dueDate, today) <= 40 && !usedCp.has(i.counterpartyId));
  paidRecent.slice(0, 22).forEach((inv, i) => {
    usedCp.add(inv.counterpartyId);
    const released = i < 4;
    const valueDate = released ? today : addDays(inv.dueDate, -1);
    payments.push(make(inv, released ? "released" : "acknowledged", { approvedBy: daniel, valueDate, createdAt: `${addDays(valueDate, -2)}T10:15:00.000Z` }));
  });

  return payments;
}
