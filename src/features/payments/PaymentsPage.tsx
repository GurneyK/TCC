import { Send } from "lucide-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { assessPayments } from "@/agents/paymentRisk";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { RunStatusPill } from "@/components/ui/dashboard/RunStatusPill";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { Table } from "@/components/ui/table/Table";
import type { Payment, PaymentStatus } from "@/data/types";
import { releaseBlock } from "@/lib/approvals";
import { formatDate } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useActor, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { counterpartyName, STATUS_LABEL, usd } from "../shared/format";
import { useDaySnapshot } from "../shared/metrics";
import { PageHeading } from "../shared/PageHeading";
import { PaymentDrawer } from "./PaymentDrawer";
import { riskTone } from "./risk";

const TABS: Array<{ value: string; label: string; statuses: PaymentStatus[] }> = [
  { value: "pending", label: "Needs approval", statuses: ["pending_approval"] },
  { value: "draft", label: "Drafts", statuses: ["draft"] },
  { value: "approved", label: "Approved", statuses: ["approved"] },
  { value: "released", label: "Released", statuses: ["released", "acknowledged"] },
  { value: "rejected", label: "Rejected", statuses: ["rejected"] },
];

function StatusCell({ p }: { p: Payment }) {
  if (p.status === "released") return <RunStatusPill label="Waiting for bank" status="running" />;
  if (p.status === "acknowledged") return <RunStatusPill label="Acknowledged" status="complete" />;
  if (p.status === "rejected") return <RunStatusPill label="Rejected" status="failed" />;
  if (p.status === "approved") return <Badge variant="success">Approved</Badge>;
  return <Badge variant={p.status === "draft" ? "neutral" : "brand"}>{STATUS_LABEL[p.status]}</Badge>;
}

export default function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "pending";
  const selectedId = params.get("p");
  const data = useTreasury((s) => s.data);
  const release = useTreasury((s) => s.releaseApproved);
  const actor = useActor();
  const notify = useUi((s) => s.notify);
  const snapshot = useDaySnapshot();
  const scores = useMemo(() => new Map(assessPayments(snapshot).map((a) => [a.paymentId, a])), [snapshot]);
  const current = TABS.find((t) => t.value === tab) ?? TABS[0];
  const rows = data.payments
    .filter((p) => current.statuses.includes(p.status))
    .sort((a, b) => (scores.get(b.id)?.score ?? 0) - (scores.get(a.id)?.score ?? 0) || b.createdAt.localeCompare(a.createdAt));
  const approved = data.payments.filter((p) => p.status === "approved");
  const block = releaseBlock(data.payments, actor);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)));
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <PageHeading
        actions={
          <div className="flex flex-col items-end gap-1">
            <Button
              aria-describedby={block ? "release-why" : undefined}
              disabled={Boolean(block)}
              leadingIcon={<Send aria-hidden="true" className="h-4 w-4" />}
              onClick={() => {
                const r = release();
                notify(r.ok ? "Batch released" : "Not released", r.message, r.ok ? "success" : "error");
                if (r.ok) set({ tab: "released" });
              }}
            >
              Release approved ({approved.length})
            </Button>
            {block ? (
              <p className="max-w-64 text-right text-xs text-gray-600" id="release-why">
                {block}
              </p>
            ) : null}
          </div>
        }
        description="Analysts submit, the Group Treasurer approves, and nobody approves their own payment. A payment with an open high or critical finding can't be approved until someone resolves it."
        eyebrow="Payments"
        title="Approvals and release"
      />

      <Tabs
        ariaLabel="Payment status"
        items={TABS.map((t) => ({ label: t.label, value: t.value, active: t.value === current.value, count: data.payments.filter((p) => t.statuses.includes(p.status)).length }))}
        onSelect={(v) => set({ tab: v })}
      />

      <Table
        caption={`${current.label} payments. Select a row to open the payment.`}
        columns={[
          { key: "id", header: "Payment", render: (p) => <span className="font-medium text-gray-900">{p.id}</span> },
          { key: "to", header: "Payee", render: (p) => counterpartyName(data, p.counterpartyId) },
          { key: "amount", header: "Amount", align: "right", render: (p) => formatWithCode(p.amount) },
          { key: "usd", header: "USD", align: "right", render: (p) => usd(p.amount, data.rates) },
          { key: "date", header: "Value date", render: (p) => formatDate(p.valueDate) },
          {
            key: "risk",
            header: "Risk",
            render: (p) => {
              const s = scores.get(p.id)?.score;
              if (s === undefined) return <span className="text-gray-500">Not scored</span>;
              return <Badge variant={riskTone(s)}>{s} of 100</Badge>;
            },
          },
          { key: "by", header: "Created by", render: (p) => p.createdBy },
          { key: "status", header: "Status", render: (p) => <StatusCell p={p} /> },
        ]}
        emptyMessage="Nothing in this queue."
        getRowKey={(p) => p.id}
        isRowSelected={(p) => p.id === selectedId}
        onRowClick={(p) => set({ p: p.id })}
        rows={rows}
      />

      <PaymentDrawer assessment={selectedId ? scores.get(selectedId) : undefined} onClose={() => set({ p: null })} paymentId={selectedId} />
    </div>
  );
}
