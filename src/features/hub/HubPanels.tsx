import { CheckCircle2, ChevronRight, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui/empty-state/EmptyState";
import { Badge } from "@/components/ui/badge/Badge";
import { blockingFindings } from "@/lib/approvals";
import { formatDate, relativeTime } from "@/lib/dates";
import { formatWithCode } from "@/lib/money";
import { useActor, useOpenFindings, useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { actorName, counterpartyName } from "../shared/format";
import { SeverityBadge } from "../shared/SeverityBadge";
import { AGENT_STYLE, SEVERITY_EDGE } from "../shared/tones";

interface Row {
  key: string;
  href: string;
  edge: string;
  title: string;
  meta: ReactNode;
  value?: string;
  badge?: ReactNode;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section aria-labelledby={id} className="rounded-habibiLg border border-gray-200 bg-white shadow-habibiXs">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900" id={id}>
            {title}
          </h2>
          {subtitle ? <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function RowList({ rows }: { rows: Row[] }) {
  return (
    <ul className="stagger divide-y divide-gray-100">
      {rows.map((r) => (
        <li key={r.key}>
          <a className="focus-ring group relative flex items-center gap-4 py-3.5 pl-6 pr-5 transition-colors hover:bg-gray-50" href={r.href}>
            <span aria-hidden="true" className={["absolute inset-y-3 left-0 w-1 rounded-r-full", r.edge].join(" ")} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                {r.badge}
                <span className="truncate text-sm font-semibold text-gray-900">{r.title}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-gray-500">{r.meta}</span>
            </span>
            {r.value ? <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{r.value}</span> : null}
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-600" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** The work waiting for whoever is signed in. */
export function ForYou() {
  const actor = useActor();
  const open = useOpenFindings();
  const data = useTreasury((s) => s.data);
  const findings = useTreasury((s) => s.findings);
  const audit = useTreasury((s) => s.audit);
  const now = useTreasury((s) => s.now);

  if (actor.role === "treasurer") {
    const waiting = data.payments
      .filter((p) => p.status === "pending_approval")
      .map((p) => ({ p, blocked: blockingFindings(p, findings).length > 0 }))
      .sort((a, b) => Number(b.blocked) - Number(a.blocked))
      .slice(0, 5);
    return (
      <Panel
        action={<a className="focus-ring rounded-habibiSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/payments">All payments</a>}
        subtitle="Payments you can approve or reject"
        title="Waiting for your approval"
      >
        <RowList
          rows={waiting.map(({ p, blocked }) => ({
            key: p.id,
            href: `#/payments?p=${p.id}`,
            edge: blocked ? "bg-error-500" : "bg-info-500",
            title: counterpartyName(data, p.counterpartyId),
            meta: `Value date ${formatDate(p.valueDate)} · created by ${p.createdBy}`,
            value: formatWithCode(p.amount, { compact: true }),
            badge: blocked ? (
              <Badge variant="error">
                <Lock aria-hidden="true" className="h-3 w-3" />
                Blocked
              </Badge>
            ) : undefined,
          }))}
        />
      </Panel>
    );
  }

  if (actor.role === "auditor") {
    const decisions = audit
      .filter((e) => e.actor.type === "user")
      .slice(-5)
      .reverse();
    return (
      <Panel action={<a className="focus-ring rounded-habibiSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/audit">Audit log</a>} subtitle="Latest decisions by people" title="Recent decisions">
        <RowList
          rows={decisions.map((e) => ({
            key: e.id,
            href: "#/audit",
            edge: /reject/i.test(e.action) ? "bg-error-500" : /^(approved|released)/i.test(e.action) ? "bg-success-500" : "bg-brand-400",
            title: e.action,
            meta: `${actorName(e.actor)} · ${e.target.label}`,
            value: relativeTime(e.at, now),
          }))}
        />
      </Panel>
    );
  }

  const top = open.slice(0, 5);
  return (
    <Panel
      action={<a className="focus-ring rounded-habibiSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/exceptions">All exceptions</a>}
      subtitle="Ranked by risk and money at stake"
      title="Needs your attention"
    >
      {top.length ? (
        <RowList
          rows={top.map((f) => ({
            key: f.id,
            href: `#/exceptions?f=${encodeURIComponent(f.id)}`,
            edge: SEVERITY_EDGE[f.severity],
            title: f.title,
            meta: AGENT_STYLE[f.agentId].short,
            value: f.impactUsd ? formatWithCode({ minor: f.impactUsd, currency: "USD" }, { compact: true }) : undefined,
            badge: <SeverityBadge severity={f.severity} />,
          }))}
        />
      ) : (
        <div className="p-5">
          <EmptyState description="New findings land here as the feeds update." icon={<CheckCircle2 aria-hidden="true" className="h-6 w-6" />} title="All clear" />
        </div>
      )}
    </Panel>
  );
}

export function SourceHealth() {
  const sources = useTreasury((s) => s.data.sources);
  const now = useTreasury((s) => s.now);
  const stale = useStaleSources();
  const late = sources.filter((s) => stale.has(s.id)).length;
  return (
    <Panel
      action={<a className="focus-ring rounded-habibiSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/sources">Manage</a>}
      subtitle={late ? `${late} of ${sources.length} feeds late` : `All ${sources.length} feeds on time`}
      title="Data feeds"
    >
      <ul className="divide-y divide-gray-100">
        {sources.map((s) => {
          const isLate = stale.has(s.id);
          return (
            <li className="flex items-center justify-between gap-3 px-5 py-2.5" key={s.id}>
              <span className="flex min-w-0 items-center gap-2.5 text-sm text-gray-700">
                <span aria-hidden="true" className={["h-2 w-2 shrink-0 rounded-full", isLate ? "bg-warning-500" : "bg-success-500"].join(" ")} />
                <span className="truncate">{s.name}</span>
              </span>
              <span className={["shrink-0 text-xs", isLate ? "font-semibold text-warning-700" : "text-gray-500"].join(" ")}>
                {isLate ? `Late, ${relativeTime(s.lastSyncAt, now)}` : relativeTime(s.lastSyncAt, now)}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function RecentActivity() {
  const audit = useTreasury((s) => s.audit);
  const now = useTreasury((s) => s.now);
  const events = audit.slice(-5).reverse();
  const tone = (e: (typeof events)[number]) =>
    e.actor.type === "agent" ? "bg-brand-500" : /reject/i.test(e.action) ? "bg-error-500" : /^(approved|released|accepted)/i.test(e.action) ? "bg-success-500" : e.actor.type === "user" ? "bg-info-500" : "bg-gray-400";
  return (
    <Panel action={<a className="focus-ring rounded-habibiSm text-sm font-semibold text-brand-700 hover:text-brand-800" href="#/audit">Audit log</a>} title="Latest activity">
      <ol className="px-5 py-3">
        {events.map((e, i) => (
          <li className="relative flex gap-3 pb-4 last:pb-0" key={e.id}>
            {i < events.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-1 top-4 w-px bg-gray-200" /> : null}
            <span aria-hidden="true" className={["relative mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-white", tone(e)].join(" ")} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-gray-900">{e.action}</span>
                <span className="shrink-0 text-xs text-gray-500">{relativeTime(e.at, now)}</span>
              </span>
              <span className="mt-0.5 block truncate text-xs text-gray-500">
                {actorName(e.actor)} · {e.target.label}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
