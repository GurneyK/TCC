import { Alert } from "@/components/ui/alert/Alert";
import { KeyValueGrid } from "@/components/ui/data-display/KeyValueGrid";
import { Drawer } from "@/components/ui/drawer/Drawer";
import { Table } from "@/components/ui/table/Table";
import type { BankAccount } from "@/data/types";
import { formatDate, formatDateTime, relativeTime } from "@/lib/dates";
import { formatWithCode, toUsd } from "@/lib/money";
import { useStaleSources, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { bankName, entityName } from "../shared/format";

export function AccountDrawer({ account, onClose }: { account: BankAccount | null; onClose: () => void }) {
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  const stale = useStaleSources();
  const openRecord = useUi((s) => s.openRecord);
  if (!account) return null;
  const live = data.accounts.find((a) => a.id === account.id) ?? account;
  const src = data.sources.find((s) => s.id === live.sourceId);
  const lines = data.transactions
    .filter((t) => t.accountId === live.id)
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))
    .slice(0, 8);

  return (
    <Drawer description={entityName(data, live.entityId)} onOpenChange={(o) => !o && onClose()} open title={`${bankName(data, live.bankId)} ${live.maskedNumber}`}>
      <div className="space-y-6">
        {stale.has(live.sourceId) && src ? (
          <Alert title="Last known balance" variant="warning">
            {src.name} last synced {relativeTime(src.lastSyncAt, now)}, at {formatDateTime(src.lastSyncAt)}. Retry the sync from Data sources.
          </Alert>
        ) : null}
        <KeyValueGrid
          items={[
            { label: "Balance", value: formatWithCode(live.balance) },
            { label: "Available", value: formatWithCode(live.availableBalance) },
            { label: "USD equivalent", value: formatWithCode(toUsd(live.balance, data.rates)) },
            { label: "Account type", value: live.type },
            { label: "Feed", value: src ? `${src.name} · ${src.format}` : live.sourceId },
            { label: "Last sync", value: src ? formatDateTime(src.lastSyncAt) : "" },
          ]}
        />
        <section aria-labelledby="acct-lines">
          <h3 className="mb-3 text-sm font-semibold text-gray-900" id="acct-lines">
            Latest bank lines
          </h3>
          <Table
            caption="Latest bank lines on this account"
            columns={[
              { key: "date", header: "Value date", render: (t) => formatDate(t.valueDate) },
              { key: "ref", header: "Reference", render: (t) => <span className="block max-w-40 truncate">{t.reference}</span> },
              { key: "amt", header: "Amount", align: "right", render: (t) => `${t.direction === "out" ? "−" : ""}${formatWithCode(t.amount)}` },
              { key: "status", header: "Status" },
            ]}
            emptyMessage="No lines on this account yet."
            getRowKey={(t) => t.id}
            onRowClick={(t) => openRecord({ type: "transaction", id: t.id, label: t.reference })}
            rows={lines}
          />
        </section>
      </div>
    </Drawer>
  );
}
