/**
 * The planted demo moments. These always exist, whatever the seed.
 * Tests assert each one is present and caught by the right agent.
 */
export const SCENARIOS = {
  S1: {
    title: "Bank details changed before a large payment",
    counterparty: "Orchard Packaging Co.",
    entityId: "ent-us",
    invoiceNumber: "INV-41877",
    paymentId: "pay-s1-orchard",
    amountMajor: 1_840_000,
    changedDaysAgo: 2,
  },
  S2: {
    title: "Likely duplicate payment",
    counterparty: "Bluewave Logistics",
    entityId: "ent-us",
    invoiceNumbers: ["INV-20431", "INV-20431A"],
    paymentIds: ["pay-s2-bluewave-a", "pay-s2-bluewave-b"],
    amountMajor: 386_420,
  },
  S3: {
    title: "Watchlist near match",
    counterparty: "Kestral Holding Limited",
    watchlistName: "Kestrel Holdings Ltd",
    entityId: "ent-eu",
    invoiceNumber: "INV-51230",
    paymentId: "pay-s3-kestral",
    amountMajor: 612_900,
  },
  S4: {
    title: "Customer short pay",
    customer: "Brightmart",
    entityId: "ent-us",
    invoiceNumber: "AR-88120",
    invoiceMajor: 1_265_000,
    shortPct: 0.046,
    transactionId: "tx-s4-brightmart",
  },
  S5: { title: "Bank fee debits", count: 14 },
  S6: {
    title: "Entity below minimum balance",
    entityId: "ent-br",
    supplier: "Verde Agro Supplies",
    breachWeek: 6,
    invoices: [
      { number: "INV-60311", dueInDays: 22, major: 22_000_000 },
      { number: "INV-60312", dueInDays: 30, major: 24_000_000 },
      { number: "INV-60313", dueInDays: 38, major: 26_000_000 },
    ],
  },
  S7: { title: "EUR under hedged", currency: "EUR" as const, ratio: 0.48 },
  S8: { title: "Stale bank feed", sourceId: "src-crestwood", staleHours: 26 },
} as const;

/** Open UK receivables that the sample Crestwood statement settles. */
export const CSV_INVOICES: Array<{ number: string; customer: string; major: number; dueInDays: number }> = [
  { number: "AR-77001", customer: "Tesvia", major: 184_250, dueInDays: -2 },
  { number: "AR-77002", customer: "Maple Market", major: 92_400, dueInDays: -1 },
  { number: "AR-77003", customer: "Tesvia", major: 310_800, dueInDays: 0 },
  { number: "AR-77004", customer: "Shopwell Online", major: 47_125, dueInDays: 0 },
  { number: "AR-77005", customer: "Maple Market", major: 128_960, dueInDays: 1 },
  { number: "AR-77006", customer: "Tesvia", major: 205_000, dueInDays: 1 },
  { number: "AR-77007", customer: "Shopwell Online", major: 66_340, dueInDays: 2 },
  { number: "AR-77008", customer: "Maple Market", major: 151_700, dueInDays: 2 },
  { number: "AR-77009", customer: "Tesvia", major: 88_215, dueInDays: 3 },
  { number: "AR-77010", customer: "Shopwell Online", major: 239_480, dueInDays: 3 },
  { number: "AR-77011", customer: "Maple Market", major: 74_090, dueInDays: 3 },
  { number: "AR-77012", customer: "Tesvia", major: 166_600, dueInDays: 4 },
  { number: "AR-77013", customer: "Shopwell Online", major: 53_875, dueInDays: 4 },
  { number: "AR-77014", customer: "Maple Market", major: 119_330, dueInDays: 5 },
  { number: "AR-77015", customer: "Tesvia", major: 271_150, dueInDays: 5 },
];

export const CSV_ACCOUNT_LAST4 = "4417";

/** Named counterparties pinned to an entity so the scenarios line up. */
export const PINNED_HOME: Record<string, string> = {
  "Orchard Packaging Co.": "ent-us",
  "Bluewave Logistics": "ent-us",
  "Halden Chemicals": "ent-de",
  "Sunreach Palm Oils": "ent-mx",
  "Verde Agro Supplies": "ent-br",
  "Corrugate Partners": "ent-ca",
  "Ionix Fragrances": "ent-eu",
  "Kestral Holding Limited": "ent-eu",
  Brightmart: "ent-us",
  Tesvia: "ent-uk",
  "Maple Market": "ent-uk",
  "Shopwell Online": "ent-uk",
};
