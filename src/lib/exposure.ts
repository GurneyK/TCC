import type { CurrencyCode, Hedge, Invoice } from "@/data/types";
import { daysBetween } from "./dates";

export const EXPOSURE_WINDOW_DAYS = 90;
export const HEDGE_POLICY = { min: 0.6, max: 0.8, target: 0.7, overHedged: 1 } as const;
/** Fixed dealer spread used for indicative forward pricing. */
export const FORWARD_SPREAD = 0.0015;

export interface CurrencyExposure {
  currency: CurrencyCode;
  receivable: number; // minor units
  payable: number;
  net: number; // receivable minus payable
  hedged: number;
  ratio: number; // hedged / abs(net)
}

export function openInWindow(invoice: Invoice, today: string) {
  if (invoice.status === "paid") return false;
  const d = daysBetween(today, invoice.dueDate);
  return d >= 0 && d <= EXPOSURE_WINDOW_DAYS;
}

/** Net exposure per non USD currency over the next 3 months, and how much of it is hedged. */
export function computeExposures(invoices: Invoice[], hedges: Hedge[], today: string): CurrencyExposure[] {
  const map = new Map<CurrencyCode, CurrencyExposure>();
  const get = (currency: CurrencyCode) => {
    let e = map.get(currency);
    if (!e) {
      e = { currency, receivable: 0, payable: 0, net: 0, hedged: 0, ratio: 0 };
      map.set(currency, e);
    }
    return e;
  };

  for (const inv of invoices) {
    if (inv.amount.currency === "USD" || !openInWindow(inv, today)) continue;
    const e = get(inv.amount.currency);
    if (inv.kind === "AR") e.receivable += inv.amount.minor;
    else e.payable += inv.amount.minor;
  }

  for (const h of hedges) {
    if (h.currency === "USD") continue;
    const d = daysBetween(today, h.maturityDate);
    if (d < 0 || d > EXPOSURE_WINDOW_DAYS) continue;
    get(h.currency).hedged += h.notional.minor;
  }

  return [...map.values()]
    .map((e) => {
      const net = e.receivable - e.payable;
      return { ...e, net, ratio: net === 0 ? 0 : e.hedged / Math.abs(net) };
    })
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
