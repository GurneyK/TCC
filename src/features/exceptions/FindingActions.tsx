import { ArrowRight, Check, PhoneCall, UserRoundCheck, X } from "lucide-react";
import { useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Finding } from "@/agents/types";
import { Alert } from "@/components/ui/alert/Alert";
import { Button } from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal/Modal";
import { Textarea } from "@/components/ui/textarea/Textarea";
import { PERSONAS } from "@/data/world";
import { formatDateTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { paymentIdOf } from "@/store/findingActions";
import { useActor, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";

type Mode = null | "dismiss" | "escalate" | "callback";

export function FindingActions({ finding }: { finding: Finding }) {
  const actor = useActor();
  const accept = useTreasury((s) => s.acceptFinding);
  const dismiss = useTreasury((s) => s.dismissFinding);
  const escalate = useTreasury((s) => s.escalateFinding);
  const verify = useTreasury((s) => s.verifyCallback);
  const payments = useTreasury((s) => s.data.payments);
  const notify = useUi((s) => s.notify);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<"confirmed" | "not_confirmed" | null>(null);
  const noteId = useId();

  const pid = paymentIdOf(finding);
  const payment = payments.find((p) => p.id === pid) ?? payments.find((p) => p.linkedFindingIds.includes(finding.id));
  const open = finding.status === "open" || finding.status === "escalated";
  const isCallback = finding.recommendation.action === "verify_callback";
  const close = () => {
    setMode(null);
    setNote("");
    setError("");
    setOutcome(null);
  };

  const paymentLink = payment ? (
    <Button onClick={() => navigate(`/payments?tab=${payment.status === "pending_approval" ? "pending" : payment.status === "draft" ? "draft" : payment.status === "rejected" ? "rejected" : payment.status === "approved" ? "approved" : "released"}&p=${payment.id}`)} size="sm" trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />} variant="tertiaryColor">
      Open payment {payment.id}
    </Button>
  ) : null;

  if (!open) {
    return (
      <div className="space-y-2" data-tour="finding-actions">
        <Alert title={finding.status === "accepted" ? "Resolved" : finding.status === "dismissed" ? "Dismissed" : "Escalated"} variant={finding.status === "dismissed" ? "info" : "success"}>
          {finding.resolution ? `${finding.resolution.by} at ${formatDateTime(finding.resolution.at)}: ${finding.resolution.note}` : "No note recorded."}
          {payment ? ` Payment ${payment.id} is now ${payment.status.replace("_", " ")}.` : ""}
        </Alert>
        {paymentLink}
      </div>
    );
  }

  if (actor.role === "auditor") {
    return (
      <div className="space-y-2" data-tour="finding-actions">
        <p className="rounded-h3lMd border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">Read only. Analysts and treasurers resolve findings.</p>
        {paymentLink}
      </div>
    );
  }

  const run = (title: string, r: { ok: boolean; message: string }) => notify(r.ok ? title : "Not done", r.message, r.ok ? "success" : "error");

  const submit = () => {
    if (mode === "dismiss") {
      if (!note.trim()) return setError("Write why you're dismissing this. It goes in the audit log.");
      dismiss(finding.id, note);
      notify("Finding dismissed", "Your reason is in the audit log.", "info");
    } else if (mode === "escalate") {
      escalate(finding.id, note);
      notify("Escalated", `Assigned to ${PERSONAS.treasurer.name}.`, "info");
    } else if (mode === "callback") {
      if (!outcome) return setError("Choose what the callback found.");
      verify(finding.id, outcome === "confirmed", note);
      notify(
        outcome === "confirmed" ? "Callback confirmed" : "Payment rejected",
        outcome === "confirmed" ? "The bank details are verified. The payment can go to the treasurer." : "The callback didn't confirm the change, so the payment was rejected automatically.",
        outcome === "confirmed" ? "success" : "warning",
      );
    }
    close();
  };

  return (
    <section aria-labelledby="rec-title" className="space-y-3 rounded-h3lLg border border-brand-200 bg-brand-25 p-4" data-tour="finding-actions">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900" id="rec-title">
          <span className="text-brand-700">Recommended:</span> {finding.recommendation.label}
        </p>
        {finding.recommendation.amount ? <p className="text-sm font-semibold tabular-nums text-gray-900">{formatWithCode(finding.recommendation.amount)}</p> : null}
      </div>
      {finding.status === "escalated" && finding.resolution ? <p className="text-sm text-warning-700">{finding.resolution.note}</p> : null}
      <div className="flex flex-wrap gap-2">
        {isCallback ? (
          <Button leadingIcon={<PhoneCall aria-hidden="true" className="h-4 w-4" />} onClick={() => setMode("callback")}>
            Record callback result
          </Button>
        ) : (
          <Button leadingIcon={<Check aria-hidden="true" className="h-4 w-4" />} onClick={() => run("Done", accept(finding.id))}>
            {finding.recommendation.label}
          </Button>
        )}
        <Button leadingIcon={<X aria-hidden="true" className="h-4 w-4" />} onClick={() => setMode("dismiss")} variant="secondaryGray">
          Dismiss
        </Button>
        {finding.status !== "escalated" ? (
          <Button leadingIcon={<UserRoundCheck aria-hidden="true" className="h-4 w-4" />} onClick={() => setMode("escalate")} variant="secondaryGray">
            Escalate to treasurer
          </Button>
        ) : null}
        {paymentLink}
      </div>
      <p className="text-xs text-gray-600">Agents recommend. People with the right role approve.</p>

      <Modal
        description={
          mode === "dismiss"
            ? "A written reason is required. It's stored in the audit log with your name."
            : mode === "escalate"
              ? `This assigns the finding to ${PERSONAS.treasurer.name} and adds it to their queue.`
              : "Call the supplier on the number already on file, never the one in the change request."
        }
        footer={
          <>
            <Button onClick={close} variant="secondaryGray">
              Cancel
            </Button>
            <Button onClick={submit} variant={mode === "callback" && outcome === "not_confirmed" ? "destructive" : "primary"}>
              {mode === "dismiss" ? "Dismiss finding" : mode === "escalate" ? "Escalate" : "Save result"}
            </Button>
          </>
        }
        onOpenChange={(o) => !o && close()}
        open={mode !== null}
        title={mode === "dismiss" ? "Dismiss this finding" : mode === "escalate" ? "Escalate to the treasurer" : "Record the callback"}
      >
        <div className="space-y-4">
          {mode === "callback" ? (
            <fieldset>
              <legend className="text-sm font-medium text-gray-700">What did the callback find?</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["confirmed", "not_confirmed"] as const).map((o) => (
                  <label className={["focus-within:focus-ring flex cursor-pointer items-start gap-2 rounded-h3lMd border p-3 text-sm", outcome === o ? "border-brand-300 bg-brand-50" : "border-gray-300 bg-white"].join(" ")} key={o}>
                    <input checked={outcome === o} className="mt-1" name="callback" onChange={() => { setOutcome(o); setError(""); }} type="radio" />
                    <span>
                      <span className="block font-semibold text-gray-900">{o === "confirmed" ? "Confirmed" : "Not confirmed"}</span>
                      <span className="text-gray-600">{o === "confirmed" ? "The supplier confirmed the new account." : "The supplier didn't recognise it. The payment is rejected."}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div>
            <label className="text-sm font-medium text-gray-700" htmlFor={noteId}>
              {mode === "dismiss" ? "Reason" : "Note (optional)"}
            </label>
            <Textarea
              aria-describedby={error ? `${noteId}-err` : undefined}
              className="mt-1"
              id={noteId}
              invalid={Boolean(error) && mode === "dismiss"}
              onChange={(e) => {
                setNote(e.target.value);
                setError("");
              }}
              value={note}
            />
            {error ? (
              <p className="mt-1 text-sm text-error-700" id={`${noteId}-err`} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </Modal>
    </section>
  );
}
