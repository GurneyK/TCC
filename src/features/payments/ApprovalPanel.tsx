import { Lock } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button/Button";
import { Textarea } from "@/components/ui/textarea/Textarea";
import type { Payment } from "@/data/types";
import { approvalBlock, rejectBlock, submitBlock } from "@/lib/approvals";
import { useActor, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";

/** Maker and checker controls. Every disabled button shows the reason as text next to it. */
export function ApprovalPanel({ payment }: { payment: Payment }) {
  const actor = useActor();
  const findings = useTreasury((s) => s.findings);
  const approve = useTreasury((s) => s.approvePayment);
  const reject = useTreasury((s) => s.rejectPayment);
  const submit = useTreasury((s) => s.submitPayment);
  const notify = useUi((s) => s.notify);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const commentId = useId();
  const whyId = useId();

  if (actor.role === "auditor") {
    return <p className="text-sm text-gray-600">Read only. Auditors see the full trail but can't act on payments.</p>;
  }

  if (payment.status === "draft") {
    const block = submitBlock(payment, actor);
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">Drafts don't count in the forecast until they're submitted.</p>
        <Button
          disabled={Boolean(block)}
          onClick={() => {
            const r = submit(payment.id);
            notify(r.ok ? "Submitted" : "Not submitted", r.message, r.ok ? "success" : "error");
          }}
        >
          Submit for approval
        </Button>
      </div>
    );
  }

  if (payment.status !== "pending_approval") {
    return <p className="text-sm text-gray-600">No action needed. This payment is {payment.status.replace("_", " ")}.</p>;
  }

  const approveWhy = approvalBlock(payment, actor, findings);
  const rejectWhy = rejectBlock(payment, actor);

  return (
    <div className="space-y-3" data-tour="approval">
      {approveWhy ? (
        <p className="flex items-start gap-2 rounded-h3lMd border border-warning-300 bg-warning-50 p-3 text-sm text-warning-700" id={whyId}>
          <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <span className="font-semibold">Approve is unavailable. </span>
            {approveWhy}
          </span>
        </p>
      ) : null}
      {!rejectWhy ? (
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor={commentId}>
            Comment {approveWhy ? "(required to reject)" : "(required to reject, optional to approve)"}
          </label>
          <Textarea
            aria-describedby={error ? `${commentId}-err` : undefined}
            className="mt-1 min-h-16"
            id={commentId}
            invalid={Boolean(error)}
            onChange={(e) => {
              setComment(e.target.value);
              setError("");
            }}
            value={comment}
          />
          {error ? (
            <p className="mt-1 text-sm text-error-700" id={`${commentId}-err`}>
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          disabled={Boolean(rejectWhy)}
          onClick={() => {
            if (!comment.trim()) return setError("Add a reason so the analyst knows what to fix.");
            const r = reject(payment.id, comment);
            notify(r.ok ? "Payment rejected" : "Not rejected", r.message, r.ok ? "info" : "error");
          }}
          variant="secondaryGray"
        >
          Reject
        </Button>
        <Button
          aria-describedby={approveWhy ? whyId : undefined}
          disabled={Boolean(approveWhy)}
          onClick={() => {
            const r = approve(payment.id, comment);
            notify(r.ok ? "Payment approved" : "Not approved", r.message, r.ok ? "success" : "error");
          }}
        >
          Approve
        </Button>
      </div>
      {rejectWhy && actor.role === "analyst" ? <p className="text-right text-xs text-gray-600">Waiting for the Group Treasurer.</p> : null}
    </div>
  );
}
