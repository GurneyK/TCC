import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PaymentAssessment } from "@/agents/paymentRisk";
import { Alert } from "@/components/ui/alert/Alert";
import { Badge } from "@/components/ui/badge/Badge";
import { KeyValueGrid } from "@/components/ui/data-display/KeyValueGrid";
import { Drawer } from "@/components/ui/drawer/Drawer";
import { linkedFindings } from "@/lib/approvals";
import { formatDate } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useTreasury } from "@/store/useTreasury";
import { AuditTimeline } from "../shared/AuditTimeline";
import { counterpartyName, entityName, STATUS_LABEL, usd } from "../shared/format";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";
import { ApprovalPanel } from "./ApprovalPanel";
import { riskTone } from "./risk";

export function PaymentDrawer({ assessment, onClose, paymentId }: { paymentId: string | null; assessment?: PaymentAssessment; onClose: () => void }) {
  const data = useTreasury((s) => s.data);
  const findings = useTreasury((s) => s.findings);
  const navigate = useNavigate();
  const p = data.payments.find((x) => x.id === paymentId);
  if (!p) return null;
  const linked = linkedFindings(p, findings);
  const account = data.accounts.find((a) => a.id === p.fromAccountId);

  return (
    <Drawer description={`${STATUS_LABEL[p.status]} · ${p.id}`} footer={<ApprovalPanel payment={p} />} onOpenChange={(o) => !o && onClose()} open title={`${formatWithCode(p.amount)} to ${counterpartyName(data, p.counterpartyId)}`}>
      <div className="space-y-6">
        {p.status === "rejected" && p.rejectedReason ? (
          <Alert title="Rejected" variant="error">
            {p.rejectedReason}
          </Alert>
        ) : null}
        <KeyValueGrid
          items={[
            { label: "USD equivalent", value: usd(p.amount, data.rates, false) },
            { label: "Value date", value: formatDate(p.valueDate) },
            { label: "Paying entity", value: entityName(data, p.entityId) },
            { label: "From account", value: account ? `${account.currency} ${account.maskedNumber}` : p.fromAccountId },
            { label: "Kind", value: p.kind === "intercompany" ? "Intercompany funding" : p.kind === "supplier" ? "Supplier payment" : "FX settlement" },
            { label: "Invoices", value: p.invoiceIds.map((id) => data.invoices.find((i) => i.id === id)?.number ?? id).join(", ") || "None" },
            { label: "Created by", value: p.createdBy },
            { label: "Approved by", value: p.approvedBy ?? "Not yet" },
          ]}
        />

        <section aria-labelledby="risk-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900" id="risk-title">
              Payment Risk checks
            </h3>
            {assessment ? <Badge variant={riskTone(assessment.score)}>Score {assessment.score} of 100</Badge> : <Badge>Not scored</Badge>}
          </div>
          {assessment && assessment.checks.length ? (
            <ul className="space-y-2">
              {assessment.checks.map((c) => (
                <li className="rounded-h3lMd border border-gray-200 p-3" key={c.key}>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={c.severity} />
                    <span className="text-sm font-semibold text-gray-900">{c.title}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{c.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">{assessment ? "Every check passed: known bank details, usual size, usual paying entity, no watchlist match." : "Only drafts and payments waiting for approval are scored."}</p>
          )}
        </section>

        {linked.length ? (
          <section aria-labelledby="linked-title" className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900" id="linked-title">
              Linked findings
            </h3>
            {linked.map((f) => (
              <button
                className="focus-ring flex w-full items-center justify-between gap-3 rounded-h3lMd border border-gray-200 p-3 text-left hover:bg-gray-50"
                key={f.id}
                onClick={() => navigate(`/exceptions?f=${encodeURIComponent(f.id)}`)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={f.severity} />
                    <FindingStatusBadge status={f.status} />
                  </span>
                  <span className="mt-1 block text-sm font-medium text-gray-900">{f.title}</span>
                </span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
              </button>
            ))}
          </section>
        ) : null}

        <section aria-labelledby="pay-history" className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900" id="pay-history">
            Audit trail
          </h3>
          <AuditTimeline ids={[p.id, ...linked.map((f) => f.id)]} />
        </section>
      </div>
    </Drawer>
  );
}
