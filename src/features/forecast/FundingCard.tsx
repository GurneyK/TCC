import { ArrowRight, Landmark } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Finding } from "@/agents/types";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { useActor, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";

/** The Cash Forecast agent's funding recommendation, with a one click path to a draft payment. */
export function FundingCard({ finding }: { finding: Finding }) {
  const actor = useActor();
  const accept = useTreasury((s) => s.acceptFinding);
  const payments = useTreasury((s) => s.data.payments);
  const notify = useUi((s) => s.notify);
  const navigate = useNavigate();
  const draft = payments.find((p) => p.linkedFindingIds.includes(finding.id));
  const open = finding.status === "open" || finding.status === "escalated";

  return (
    <article className="rounded-h3lLg border border-brand-200 bg-brand-50 p-5 shadow-h3lXs">
      <div className="space-y-4">
        <div className="flex min-w-0 gap-3">
          <div className="h-fit rounded-h3lMd bg-white p-2 text-brand-700">
            <Landmark aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <FindingStatusBadge status={finding.status} />
              <Badge variant="neutral">Confidence {Math.round(finding.confidence * 100)}%</Badge>
            </div>
            <h2 className="mt-2 text-base font-semibold text-gray-900">{finding.title}</h2>
            <p className="mt-1 text-sm leading-6 text-gray-700">{finding.summary}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {finding.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t border-brand-200 pt-4">
          {open && actor.role !== "auditor" ? (
            <Button
              onClick={() => {
                const r = accept(finding.id);
                notify(r.ok ? "Draft payment created" : "Not done", r.message, r.ok ? "success" : "error");
              }}
            >
              {finding.recommendation.label}
            </Button>
          ) : null}
          {open && actor.role === "auditor" ? <p className="text-sm text-gray-600">Read only. Analysts and treasurers can accept this.</p> : null}
          {draft ? (
            <Button onClick={() => navigate(`/payments?tab=${draft.status === "draft" ? "draft" : draft.status === "pending_approval" ? "pending" : draft.status === "approved" ? "approved" : "released"}&p=${draft.id}`)} trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />} variant="secondaryGray">
              Open payment {draft.id}
            </Button>
          ) : null}
          {finding.resolution ? (
            <p className="text-xs text-gray-600">
              {finding.resolution.by}: {finding.resolution.note}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
