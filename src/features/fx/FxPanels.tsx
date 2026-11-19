import type { Finding } from "@/agents/types";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { Table } from "@/components/ui/table/Table";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useActor, useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { bankName } from "../shared/format";
import { FindingStatusBadge, SeverityBadge } from "../shared/SeverityBadge";

export function Recommendations({ findings }: { findings: Finding[] }) {
  const actor = useActor();
  const accept = useTreasury((s) => s.acceptFinding);
  const notify = useUi((s) => s.notify);
  if (!findings.length) {
    return (
      <section className="rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs">
        <h2 className="text-sm font-semibold text-gray-900">Recommendations</h2>
        <p className="mt-2 text-sm text-gray-600">Every currency is inside policy.</p>
      </section>
    );
  }
  return (
    <section aria-labelledby="fx-recs" className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-900" id="fx-recs">
        Recommendations
      </h2>
      {findings.map((f) => (
        <article className="rounded-h3lLg border border-gray-200 bg-white p-5 shadow-h3lXs" data-tour={f.id === "fx-EUR-under" ? "fx-rec" : undefined} key={f.id}>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={f.severity} />
            <FindingStatusBadge status={f.status} />
          </div>
          <h3 className="mt-2 text-base font-semibold text-gray-900">{f.title}</h3>
          <p className="mt-1 text-sm leading-6 text-gray-600">{f.summary}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
            {f.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          {f.status === "open" && actor.role !== "auditor" ? (
            <div className="mt-4">
              <Button
                onClick={() => {
                  const r = accept(f.id);
                  notify(r.ok ? "Hedge requested" : "Not done", r.message, r.ok ? "success" : "error");
                }}
                size="sm"
              >
                {f.recommendation.label}
              </Button>
            </div>
          ) : null}
          {f.resolution ? (
            <p className="mt-3 text-xs text-gray-600">
              {f.resolution.by} at {formatDateTime(f.resolution.at)}: {f.resolution.note}
            </p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function HedgeRequests() {
  const requests = useTreasury((s) => s.hedgeRequests);
  const book = useTreasury((s) => s.bookHedge);
  const actor = useActor();
  const notify = useUi((s) => s.notify);
  if (!requests.length) return null;
  return (
    <section aria-labelledby="hedge-requests" className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900" id="hedge-requests">
        Hedge requests
      </h2>
      <Table
        caption="Forward hedge requests waiting for the treasurer"
        columns={[
          { key: "id", header: "Request" },
          { key: "notional", header: "Notional", align: "right", render: (r) => formatWithCode(r.notional) },
          { key: "rate", header: "Indicative rate", align: "right", render: (r) => String(r.indicativeRate) },
          { key: "by", header: "Raised by", render: (r) => `${r.createdBy}, ${formatDateTime(r.createdAt)}` },
          {
            key: "action",
            header: "Status",
            render: (r) => {
              if (r.bookedHedgeId) return <Badge variant="success">Booked as {r.bookedHedgeId}</Badge>;
              if (actor.role !== "treasurer") return <Badge variant="warning">Waiting for treasurer</Badge>;
              if (r.createdBy === actor.name) return <span className="text-xs text-gray-600">You raised this. A second person books it.</span>;
              return (
                <Button
                  onClick={() => {
                    const res = book(r.id);
                    notify(res.ok ? "Forward booked" : "Not booked", res.message, res.ok ? "success" : "error");
                  }}
                  size="sm"
                >
                  Book forward
                </Button>
              );
            },
          },
        ]}
        getRowKey={(r) => r.id}
        rows={requests}
      />
    </section>
  );
}

export function HedgeBook() {
  const data = useTreasury((s) => s.data);
  const openRecord = useUi((s) => s.openRecord);
  const hedges = [...data.hedges].sort((a, b) => a.maturityDate.localeCompare(b.maturityDate));
  return (
    <section aria-labelledby="hedge-book" className="space-y-3">
      <h2 className="text-base font-semibold text-gray-900" id="hedge-book">
        Hedge book
      </h2>
      <Table
        caption="Outstanding forward contracts. Select a row for detail."
        columns={[
          { key: "id", header: "Hedge" },
          { key: "notional", header: "Notional", align: "right", render: (h) => formatWithCode(h.notional) },
          { key: "rate", header: "Rate", align: "right", render: (h) => String(h.rate) },
          { key: "trade", header: "Traded", render: (h) => formatDate(h.tradeDate) },
          { key: "maturity", header: "Matures", render: (h) => formatDate(h.maturityDate) },
          { key: "bank", header: "Bank", render: (h) => bankName(data, h.bankId) },
        ]}
        getRowKey={(h) => h.id}
        onRowClick={(h) => openRecord({ type: "hedge", id: h.id, label: h.id })}
        rows={hedges}
      />
    </section>
  );
}
