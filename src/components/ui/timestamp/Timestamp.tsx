import { Clock3 } from "lucide-react";

export interface TimestampProps {
  label?: string;
  value?: string;
  /** Machine readable ISO time for the <time> element. */
  dateTime?: string;
}

export function Timestamp({ dateTime = "2026-05-07T14:18:00-04:00", label = "Updated", value = "18 minutes ago" }: TimestampProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
      <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="text-gray-300">·</span>
      <time dateTime={dateTime}>{value}</time>
    </span>
  );
}
