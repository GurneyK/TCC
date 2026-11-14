import { Download } from "lucide-react";
import { useId, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button/Button";
import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/select/Select";
import { Table } from "@/components/ui/table/Table";
import type { AuditEvent } from "@/data/types";
import { csvCell } from "@/lib/csv";
import { formatDateTime, isoDate } from "@/lib/dates";
import { useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { actorName } from "../shared/format";
import { PageHeading } from "../shared/PageHeading";

const ACTOR_TYPES = [
  { value: "all", label: "Everyone" },
  { value: "user", label: "People" },
  { value: "agent", label: "Agents" },
  { value: "system", label: "System" },
];

const DATES = [
  { value: "all", label: "All dates" },
  { value: "today", label: "Today" },
  { value: "before", label: "Before today" },
];

function details(e: AuditEvent) {
  return Object.entries(e.details ?? {})
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
}

export default function AuditPage() {
  const audit = useTreasury((s) => s.audit);
  const now = useTreasury((s) => s.now);
  const notify = useUi((s) => s.notify);
  const [params, setParams] = useSearchParams();
  const ids = { actor: useId(), name: useId(), target: useId(), date: useId(), q: useId() };
  const f = {
    actor: params.get("actor") ?? "all",
    name: params.get("name") ?? "all",
    target: params.get("target") ?? "all",
    date: params.get("date") ?? "all",
    q: params.get("q") ?? "",
  };
  const set = (k: keyof typeof f, v: string) => {
    const next = new URLSearchParams(params);
    if (!v || v === "all") next.delete(k);
    else next.set(k, v);
    setParams(next, { replace: true });
  };

  const names = useMemo(() => [...new Set(audit.map((e) => actorName(e.actor)))].sort(), [audit]);
  const targets = useMemo(() => [...new Set(audit.map((e) => e.target.type))].sort(), [audit]);
  const today = isoDate(now);
  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return audit
      .filter((e) => (f.actor === "all" || e.actor.type === f.actor) && (f.name === "all" || actorName(e.actor) === f.name) && (f.target === "all" || e.target.type === f.target))
      .filter((e) => f.date === "all" || (f.date === "today" ? isoDate(e.at) === today : isoDate(e.at) < today))
      .filter((e) => !q || `${e.action} ${e.target.label} ${e.target.id} ${details(e)}`.toLowerCase().includes(q))
      .slice()
      .reverse();
  }, [audit, f.actor, f.name, f.target, f.date, f.q, today]);

  const exportCsv = () => {
    const header = ["id", "at", "actor_type", "actor", "action", "target_type", "target_id", "target_label", "details"];
    const lines = rows.map((e) => [e.id, e.at, e.actor.type, actorName(e.actor), e.action, e.target.type, e.target.id, e.target.label, details(e)].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tcc-audit-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Export ready", `${rows.length} events saved as CSV.`, "success");
  };

  return (
    <div className="space-y-6">
      <PageHeading
        actions={
          <Button leadingIcon={<Download aria-hidden="true" className="h-4 w-4" />} onClick={exportCsv} variant="secondaryGray">
            Export CSV
          </Button>
        }
        description="Every agent finding and every human decision: who, when, what and why. Events are append only."
        eyebrow="Audit log"
        title="Who did what"
      />

      <div aria-label="Filter the audit log" className="grid gap-3 rounded-habibiLg border border-gray-200 bg-white p-4 shadow-habibiXs md:grid-cols-2 xl:grid-cols-5" data-tour="audit-filters" role="search">
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor={ids.actor}>
            Actor type
          </label>
          <Select className="mt-1" id={ids.actor} onChange={(e) => set("actor", e.target.value)} value={f.actor}>
            {ACTOR_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor={ids.name}>
            Actor
          </label>
          <Select className="mt-1" id={ids.name} onChange={(e) => set("name", e.target.value)} value={f.name}>
            <option value="all">Anyone</option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor={ids.target}>
            Target
          </label>
          <Select className="mt-1" id={ids.target} onChange={(e) => set("target", e.target.value)} value={f.target}>
            <option value="all">Any record</option>
            {targets.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ")}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor={ids.date}>
            Date
          </label>
          <Select className="mt-1" id={ids.date} onChange={(e) => set("date", e.target.value)} value={f.date}>
            {DATES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor={ids.q}>
            Search actions
          </label>
          <Input className="mt-1" id={ids.q} onChange={(e) => set("q", e.target.value)} placeholder="Orchard, approved, callback" type="search" value={f.q} />
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-gray-600">
        {rows.length} of {audit.length} events
      </p>

      <Table
        caption="Audit events, newest first"
        columns={[
          { key: "at", header: "When", render: (e) => <time dateTime={e.at}>{formatDateTime(e.at)}</time> },
          { key: "actor", header: "Actor", render: (e) => <span className="font-medium text-gray-900">{actorName(e.actor)}</span> },
          { key: "action", header: "Action" },
          { key: "target", header: "Target", render: (e) => <span className="block max-w-72 truncate" title={e.target.label}>{e.target.label}</span> },
          { key: "details", header: "Details", render: (e) => <span className="block max-w-80 text-xs text-gray-600">{details(e)}</span> },
        ]}
        emptyMessage="No events match these filters."
        getRowKey={(e) => e.id}
        rows={rows.slice(0, 300)}
      />
      {rows.length > 300 ? <p className="text-sm text-gray-600">Showing the latest 300. Export to see all {rows.length}.</p> : null}
    </div>
  );
}
