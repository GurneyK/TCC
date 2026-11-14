import { Timeline } from "@/components/ui/timeline/Timeline";
import { formatDateTime } from "@/lib/dates";
import { useTreasury } from "@/store/useTreasury";
import { actorName } from "./format";

/** Every audit event for one record, newest first. */
export function AuditTimeline({ ids, emptyText = "No history yet." }: { ids: string[]; emptyText?: string }) {
  const audit = useTreasury((s) => s.audit);
  const events = audit.filter((e) => ids.includes(e.target.id)).slice().reverse();
  if (!events.length) return <p className="text-sm text-gray-600">{emptyText}</p>;
  return (
    <Timeline
      items={events.map((e) => ({
        title: e.action,
        time: formatDateTime(e.at),
        content: [actorName(e.actor), ...Object.entries(e.details ?? {}).filter(([, v]) => v !== "").map(([k, v]) => `${k}: ${v}`)].join(" · "),
      }))}
    />
  );
}
