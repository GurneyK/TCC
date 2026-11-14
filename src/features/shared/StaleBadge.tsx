import { Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge/Badge";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { formatDateTime, relativeTime } from "@/lib/dates";

/** Marks a number built from a delayed feed. Focusable so keyboard users get the tooltip too. */
export function StaleBadge({ lastSyncAt, now, source }: { lastSyncAt: string; now: string; source: string }) {
  const text = `${source} last synced ${relativeTime(lastSyncAt, now)}, at ${formatDateTime(lastSyncAt)}.`;
  return (
    <Tooltip content={text}>
      <span className="focus-ring inline-flex rounded-full" tabIndex={0}>
        <Badge variant="warning">
          <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
          Stale
        </Badge>
      </span>
    </Tooltip>
  );
}
