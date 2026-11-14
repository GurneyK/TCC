import type { BankAccount, CurrencyCode, Transaction } from "@/data/types";
import { CURRENCIES } from "@/data/world";

export const STATEMENT_COLUMNS = ["value_date", "amount", "currency", "direction", "counterparty", "reference", "account_last4"] as const;

export interface StatementRow {
  line: number;
  valueDate: string;
  amountMinor: number;
  currency: CurrencyCode;
  direction: "in" | "out";
  counterparty: string;
  reference: string;
  accountLast4: string;
  accountId?: string;
  errors: string[];
}

export interface ParsedStatement {
  headerError: string | null;
  rows: StatementRow[];
}

/** Splits one CSV line, honouring double quoted fields. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

/** Parses a decimal string into integer minor units without float math. */
export function parseMinor(value: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.replace(/,/g, ""));
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

export function parseStatement(text: string, accounts: BankAccount[]): ParsedStatement {
  const lines = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { headerError: "The file is empty.", rows: [] };
  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const missing = STATEMENT_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) return { headerError: `Missing columns: ${missing.join(", ")}.`, rows: [] };
  const col = (cells: string[], name: (typeof STATEMENT_COLUMNS)[number]) => cells[header.indexOf(name)] ?? "";

  const rows = lines.slice(1).map((line, i): StatementRow => {
    const cells = splitLine(line);
    const errors: string[] = [];
    const valueDate = col(cells, "value_date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valueDate) || Number.isNaN(Date.parse(valueDate))) errors.push("Value date must be YYYY-MM-DD");
    const amountMinor = parseMinor(col(cells, "amount"));
    if (amountMinor === null || amountMinor === 0) errors.push("Amount must be a positive number");
    const currency = col(cells, "currency").toUpperCase() as CurrencyCode;
    if (!CURRENCIES.includes(currency)) errors.push(`Unknown currency ${currency || "(blank)"}`);
    const direction = col(cells, "direction").toLowerCase();
    if (direction !== "in" && direction !== "out") errors.push("Direction must be in or out");
    const accountLast4 = col(cells, "account_last4");
    const account = accounts.find((a) => a.maskedNumber.endsWith(accountLast4));
    if (!account) errors.push(`No account ending ${accountLast4 || "(blank)"}`);
    else if (account.currency !== currency) errors.push(`Account ending ${accountLast4} holds ${account.currency}`);
    return {
      line: i + 2,
      valueDate,
      amountMinor: amountMinor ?? 0,
      currency,
      direction: direction === "out" ? "out" : "in",
      counterparty: col(cells, "counterparty"),
      reference: col(cells, "reference"),
      accountLast4,
      accountId: account?.id,
      errors,
    };
  });
  return { headerError: null, rows };
}

export function rowsToTransactions(rows: StatementRow[], batchId: string, bookedAt: string): Transaction[] {
  return rows
    .filter((r) => !r.errors.length && r.accountId)
    .map((r, i) => ({
      id: `tx-${batchId}-${String(i + 1).padStart(2, "0")}`,
      accountId: r.accountId as string,
      valueDate: r.valueDate,
      bookedAt,
      amount: { minor: r.amountMinor, currency: r.currency },
      direction: r.direction,
      counterparty: r.counterparty,
      reference: r.reference,
      status: "unmatched" as const,
    }));
}

/** Quotes a value for CSV export. */
export function csvCell(value: string | number | boolean | undefined): string {
  const s = value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
