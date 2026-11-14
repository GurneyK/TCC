export type CurrencyCode = "USD" | "CAD" | "MXN" | "BRL" | "GBP" | "EUR" | "ZAR" | "INR" | "SGD" | "CNY";

/** Money is always integer minor units plus an ISO currency code. */
export type Money = { minor: number; currency: CurrencyCode };

export type Role = "analyst" | "treasurer" | "auditor";

export type Region = "NA" | "LATAM" | "EMEA" | "APAC";

export interface Entity {
  id: string;
  name: string;
  country: string;
  currency: CurrencyCode;
  minBalance: Money;
  region: Region;
}

export interface Bank {
  id: string;
  name: string;
}

export interface BankAccount {
  id: string;
  bankId: string;
  entityId: string;
  currency: CurrencyCode;
  type: "operating" | "collections" | "payroll" | "concentration";
  maskedNumber: string;
  balance: Money;
  availableBalance: Money;
  sourceId: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  valueDate: string;
  bookedAt: string;
  amount: Money;
  direction: "in" | "out";
  counterparty: string;
  reference: string;
  status: "unmatched" | "matched" | "suggested" | "exception";
  matchedInvoiceIds?: string[];
}

export interface Invoice {
  id: string;
  number: string;
  kind: "AR" | "AP";
  entityId: string;
  counterpartyId: string;
  amount: Money;
  issueDate: string;
  dueDate: string;
  status: "open" | "partially_paid" | "paid" | "disputed";
}

export interface Counterparty {
  id: string;
  name: string;
  kind: "customer" | "supplier";
  country: string;
  maskedBankAccount?: string;
  bankDetailsChangedAt?: string;
  avgDaysLate?: number;
}

export type PaymentStatus = "draft" | "pending_approval" | "approved" | "rejected" | "released" | "acknowledged";

export interface Payment {
  id: string;
  entityId: string;
  fromAccountId: string;
  counterpartyId: string;
  invoiceIds: string[];
  amount: Money;
  valueDate: string;
  kind: "supplier" | "intercompany" | "fx_settlement";
  status: PaymentStatus;
  createdBy: string;
  createdAt: string;
  approvedBy?: string;
  rejectedReason?: string;
  linkedFindingIds: string[];
  /** For intercompany payments: the receiving entity. */
  toEntityId?: string;
}

export interface FxRate {
  pair: `${CurrencyCode}/USD`;
  rate: number;
  updatedAt: string;
}

export interface Hedge {
  id: string;
  currency: CurrencyCode;
  notional: Money;
  rate: number;
  tradeDate: string;
  maturityDate: string;
  bankId: string;
}

export interface HedgeRequest {
  id: string;
  currency: CurrencyCode;
  notional: Money;
  indicativeRate: number;
  createdBy: string;
  createdAt: string;
  findingId: string;
  /** Set once a treasurer books the forward. */
  bookedHedgeId?: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: "bank_feed" | "erp" | "market_data" | "watchlist" | "file_upload";
  format: string;
  status: "healthy" | "delayed" | "failed" | "paused";
  lastSyncAt: string;
  slaMinutes: number;
  recordsToday: number;
}

export type AuditActor =
  | { type: "user"; name: string; role: Role }
  | { type: "agent"; agentId: import("@/agents/types").AgentId }
  | { type: "system" };

export interface AuditEvent {
  id: string;
  at: string;
  actor: AuditActor;
  action: string;
  target: { type: string; id: string; label: string };
  details?: Record<string, string | number | boolean>;
}

export interface WatchlistEntry {
  id: string;
  name: string;
  list: string;
}

export interface TreasuryData {
  entities: Entity[];
  banks: Bank[];
  accounts: BankAccount[];
  transactions: Transaction[];
  invoices: Invoice[];
  counterparties: Counterparty[];
  payments: Payment[];
  rates: FxRate[];
  hedges: Hedge[];
  sources: DataSource[];
  watchlist: WatchlistEntry[];
}

/** What agents read. A plain object so agents stay pure and testable. */
export interface TreasurySnapshot extends TreasuryData {
  now: string;
}
