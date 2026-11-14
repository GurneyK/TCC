import { Badge } from "@/components/ui/badge/Badge";
import { KeyValueGrid, type KeyValueGridItem } from "@/components/ui/data-display/KeyValueGrid";
import { Drawer } from "@/components/ui/drawer/Drawer";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatWithCode, rateFor } from "@/lib/money";
import { useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { AuditTimeline } from "./AuditTimeline";
import { bankName, counterpartyName, entityName, STATUS_LABEL, usd } from "./format";

const TYPE_LABEL: Record<string, string> = {
  transaction: "Bank line",
  invoice: "Invoice",
  payment: "Payment",
  counterparty: "Counterparty",
  source: "Data source",
  fx: "FX rate",
  hedge: "Hedge",
  watchlist: "Watchlist entry",
  entity: "Entity",
};

type View = { title: string; items: KeyValueGridItem[] };

function useRecordView(): View | null {
  const record = useUi((s) => s.record);
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  if (!record) return null;
  const { id, type } = record;
  const none: View = { title: record.label, items: [{ label: "Record", value: "Not found in the current data" }] };

  switch (type) {
    case "transaction": {
      const t = data.transactions.find((x) => x.id === id);
      if (!t) return none;
      const acct = data.accounts.find((a) => a.id === t.accountId);
      return {
        title: `${t.counterparty} · ${formatWithCode(t.amount)}`,
        items: [
          { label: "Amount", value: `${t.direction === "in" ? "Credit" : "Debit"} ${formatWithCode(t.amount)}` },
          { label: "Value date", value: formatDate(t.valueDate) },
          { label: "Reference", value: t.reference },
          { label: "Status", value: <Badge variant={t.status === "matched" ? "success" : t.status === "exception" ? "warning" : "neutral"}>{t.status}</Badge> },
          { label: "Account", value: acct ? `${bankName(data, acct.bankId)} ${acct.maskedNumber}` : t.accountId },
          { label: "Entity", value: acct ? entityName(data, acct.entityId) : "" },
        ],
      };
    }
    case "invoice": {
      const i = data.invoices.find((x) => x.id === id);
      if (!i) return none;
      return {
        title: `${i.number} · ${counterpartyName(data, i.counterpartyId)}`,
        items: [
          { label: "Type", value: i.kind === "AR" ? "Receivable" : "Payable" },
          { label: "Amount", value: formatWithCode(i.amount) },
          { label: "Due", value: formatDate(i.dueDate) },
          { label: "Status", value: i.status.replace("_", " ") },
          { label: "Entity", value: entityName(data, i.entityId) },
          { label: "Issued", value: formatDate(i.issueDate) },
        ],
      };
    }
    case "payment": {
      const p = data.payments.find((x) => x.id === id);
      if (!p) return none;
      return {
        title: `${formatWithCode(p.amount)} to ${counterpartyName(data, p.counterpartyId)}`,
        items: [
          { label: "Status", value: STATUS_LABEL[p.status] },
          { label: "USD equivalent", value: usd(p.amount, data.rates, false) },
          { label: "Value date", value: formatDate(p.valueDate) },
          { label: "Paying entity", value: entityName(data, p.entityId) },
          { label: "Created by", value: p.createdBy },
          { label: "Approved by", value: p.approvedBy ?? "Not yet" },
        ],
      };
    }
    case "counterparty": {
      const c = data.counterparties.find((x) => x.id === id);
      if (!c) return none;
      return {
        title: c.name,
        items: [
          { label: "Kind", value: c.kind === "customer" ? "Customer" : "Supplier" },
          { label: "Country", value: c.country },
          { label: "Bank account", value: c.maskedBankAccount ?? "On file" },
          { label: "Bank details changed", value: c.bankDetailsChangedAt ? formatDateTime(c.bankDetailsChangedAt) : "No recent change" },
          { label: "Average days late", value: c.avgDaysLate !== undefined ? String(c.avgDaysLate) : "Not tracked" },
          { label: "Open invoices", value: String(data.invoices.filter((i) => i.counterpartyId === c.id && i.status !== "paid").length) },
        ],
      };
    }
    case "source": {
      const s = data.sources.find((x) => x.id === id);
      if (!s) return none;
      return {
        title: s.name,
        items: [
          { label: "Format", value: s.format },
          { label: "Last sync", value: formatDateTime(s.lastSyncAt) },
          { label: "SLA", value: `${s.slaMinutes} minutes` },
          { label: "Records today", value: String(s.recordsToday) },
        ],
      };
    }
    case "fx": {
      const ccy = id.split("/")[0] as Parameters<typeof rateFor>[0];
      const r = data.rates.find((x) => x.pair === id);
      return {
        title: `${id} rate`,
        items: [
          { label: "Rate", value: `${rateFor(ccy, data.rates)} USD per ${ccy}` },
          { label: "Updated", value: r ? formatDateTime(r.updatedAt) : "" },
        ],
      };
    }
    case "hedge": {
      const h = data.hedges.find((x) => x.id === id);
      if (!h) return none;
      return {
        title: `${h.id} · ${formatWithCode(h.notional, { compact: true })} forward`,
        items: [
          { label: "Notional", value: formatWithCode(h.notional) },
          { label: "Rate", value: String(h.rate) },
          { label: "Traded", value: formatDate(h.tradeDate) },
          { label: "Matures", value: formatDate(h.maturityDate) },
          { label: "Bank", value: bankName(data, h.bankId) },
        ],
      };
    }
    case "watchlist": {
      const w = data.watchlist.find((x) => x.id === id);
      if (!w) return none;
      return { title: w.name, items: [{ label: "List", value: w.list }, { label: "Screened", value: formatDateTime(now) }] };
    }
    case "entity": {
      const e = data.entities.find((x) => x.id === id);
      if (!e) return none;
      return {
        title: e.name,
        items: [
          { label: "Country", value: e.country },
          { label: "Currency", value: e.currency },
          { label: "Minimum balance", value: formatWithCode(e.minBalance, { compact: true }) },
          { label: "Bank accounts", value: String(data.accounts.filter((a) => a.entityId === e.id).length) },
        ],
      };
    }
    default:
      return none;
  }
}

/** Evidence chips anywhere in the app open the underlying record here. */
export function RecordDrawer() {
  const record = useUi((s) => s.record);
  const openRecord = useUi((s) => s.openRecord);
  const view = useRecordView();
  return (
    <Drawer description={record ? TYPE_LABEL[record.type] : undefined} onOpenChange={(o) => !o && openRecord(null)} open={Boolean(record && view)} title={view?.title ?? ""}>
      {view ? (
        <div className="space-y-6">
          <KeyValueGrid items={view.items} />
          <section aria-labelledby="record-history">
            <h3 className="mb-3 text-sm font-semibold text-gray-900" id="record-history">
              History
            </h3>
            <AuditTimeline emptyText="No decisions recorded on this record." ids={record ? [record.id] : []} />
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
