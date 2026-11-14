import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge/Badge";
import { SegmentedControl } from "@/components/ui/segmented-control/SegmentedControl";
import { StatusDot } from "@/components/ui/status-dot/StatusDot";
import { Table } from "@/components/ui/table/Table";
import type { BankAccount } from "@/data/types";
import { formatWithCode, toUsd } from "@/lib/money";
import { useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { bankName, entityName } from "../shared/format";
import { cashTotals } from "../shared/metrics";
import { PageHeading } from "../shared/PageHeading";
import { StaleBadge } from "../shared/StaleBadge";
import { AccountDrawer } from "./AccountDrawer";

type GroupBy = "entity" | "bank" | "currency";

export default function CashPage() {
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  const stale = useStaleSources();
  const [params, setParams] = useSearchParams();
  const groupBy = (params.get("group") as GroupBy) || "entity";
  const [selected, setSelected] = useState<BankAccount | null>(null);
  const totals = useMemo(() => cashTotals(data, stale), [data, stale]);
  const sourceOf = (a: BankAccount) => data.sources.find((s) => s.id === a.sourceId);

  const groups = useMemo(() => {
    const keyOf = (a: BankAccount) => (groupBy === "entity" ? a.entityId : groupBy === "bank" ? a.bankId : a.currency);
    const labelOf = (k: string) => (groupBy === "entity" ? entityName(data, k) : groupBy === "bank" ? bankName(data, k) : k);
    const map = new Map<string, BankAccount[]>();
    data.accounts.forEach((a) => map.set(keyOf(a), [...(map.get(keyOf(a)) ?? []), a]));
    return [...map.entries()]
      .map(([key, accounts]) => ({ key, label: labelOf(key), accounts, usd: accounts.reduce((s, a) => s + toUsd(a.balance, data.rates).minor, 0) }))
      .sort((a, b) => b.usd - a.usd);
  }, [data, groupBy]);

  const usd = (minor: number) => formatWithCode({ minor, currency: "USD" }, { compact: true });

  return (
    <div className="space-y-6">
      <PageHeading
        actions={
          <SegmentedControl
            label="Group accounts by"
            onChange={(v) => setParams({ group: v }, { replace: true })}
            segments={[
              { label: "Entity", value: "entity" },
              { label: "Bank", value: "bank" },
              { label: "Currency", value: "currency" },
            ]}
            value={groupBy}
          />
        }
        description={
          <>
            {data.accounts.length} accounts worth <strong className="font-semibold text-gray-900">{usd(totals.totalUsd)}</strong> at today's rates.
            {totals.staleAccounts ? ` ${totals.staleAccounts} come from a late feed and show their last known balance.` : ""}
          </>
        }
        title="Cash positions"
      />

      {groups.map((g) => (
        <section aria-labelledby={`grp-${g.key}`} className="space-y-3" key={g.key}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900" id={`grp-${g.key}`}>
              {g.label}
            </h2>
            <p className="text-sm text-gray-600">
              {g.accounts.length} account{g.accounts.length === 1 ? "" : "s"} · <span className="font-semibold text-gray-900">{usd(g.usd)}</span>
            </p>
          </div>
          <Table
            caption={`Accounts for ${g.label}. Select a row for detail.`}
            columns={[
              { key: "account", header: "Account", width: "26%", render: (a) => <span className="font-medium text-gray-900">{bankName(data, a.bankId)} {a.maskedNumber}</span> },
              { key: "entity", header: groupBy === "entity" ? "Type" : "Entity", width: groupBy === "entity" ? "13%" : "20%", render: (a) => (groupBy === "entity" ? <Badge>{a.type}</Badge> : entityName(data, a.entityId)) },
              { key: "balance", header: "Balance", align: "right", width: "17%", render: (a) => formatWithCode(a.balance) },
              { key: "available", header: "Available", align: "right", width: "17%", render: (a) => formatWithCode(a.availableBalance) },
              { key: "usd", header: "USD", align: "right", width: "13%", render: (a) => usd(toUsd(a.balance, data.rates).minor) },
              {
                key: "fresh",
                header: "Freshness",
                render: (a) => {
                  const src = sourceOf(a);
                  return stale.has(a.sourceId) && src ? <StaleBadge lastSyncAt={src.lastSyncAt} now={now} source={src.name} /> : <StatusDot label="Live" tone="success" />;
                },
              },
            ]}
            getRowKey={(a) => a.id}
            isRowSelected={(a) => a.id === selected?.id}
            layout="fixed"
            onRowClick={setSelected}
            rows={g.accounts}
          />
        </section>
      ))}

      <AccountDrawer account={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
