import type { CurrencyCode, FxRate, Money } from "@/data/types";

/** Every currency in TCC uses two decimal places. */
const MINOR_PER_MAJOR = 100;

export function money(major: number, currency: CurrencyCode): Money {
  return { minor: Math.round(major * MINOR_PER_MAJOR), currency };
}

export function zero(currency: CurrencyCode): Money {
  return { minor: 0, currency };
}

function assertSame(a: Money, b: Money) {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} and ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  assertSame(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSame(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

export function sum(items: Money[], currency: CurrencyCode): Money {
  return items.reduce((total, item) => add(total, item), zero(currency));
}

/** Scale by a ratio and round back to whole minor units. */
export function scale(a: Money, ratio: number): Money {
  return { minor: Math.round(a.minor * ratio), currency: a.currency };
}

export function rateFor(currency: CurrencyCode, rates: FxRate[]): number {
  if (currency === "USD") return 1;
  const found = rates.find((r) => r.pair === `${currency}/USD`);
  if (!found) throw new Error(`No FX rate for ${currency}`);
  return found.rate;
}

export function toUsd(a: Money, rates: FxRate[]): Money {
  return { minor: Math.round(a.minor * rateFor(a.currency, rates)), currency: "USD" };
}

export function fromUsd(usd: Money, currency: CurrencyCode, rates: FxRate[]): Money {
  return { minor: Math.round(usd.minor / rateFor(currency, rates)), currency };
}

export function toMajor(a: Money): number {
  return a.minor / MINOR_PER_MAJOR;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(currency: CurrencyCode, compact: boolean) {
  const key = `${currency}-${compact}`;
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      maximumFractionDigits: compact ? 2 : 0,
      minimumFractionDigits: 0,
    });
    formatterCache.set(key, f);
  }
  return f;
}

/** "$1,840,000" or, compact, "$1.84M". */
export function formatMoney(a: Money, opts: { compact?: boolean } = {}): string {
  return formatter(a.currency, Boolean(opts.compact)).format(toMajor(a));
}

/** Always shows the code: "BRL 12.4M". Clearer than local symbols in multi currency tables. */
export function formatWithCode(a: Money, opts: { compact?: boolean } = {}): string {
  const n = new Intl.NumberFormat("en-US", {
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 2 : 0,
  }).format(toMajor(a));
  return `${a.currency} ${n}`;
}

export function isNegative(a: Money) {
  return a.minor < 0;
}
