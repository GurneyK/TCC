const DAY_MS = 86_400_000;

/** "2026-11-12" from an ISO timestamp or date. */
export function isoDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return isoDate(new Date(new Date(value).getTime() + days * DAY_MS));
}

export function addMinutes(value: string, minutes: number): string {
  return new Date(new Date(value).getTime() + minutes * 60_000).toISOString();
}

/** Whole days from a to b (b minus a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(isoDate(b)).getTime() - new Date(isoDate(a)).getTime()) / DAY_MS);
}

export function minutesBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60_000;
}

/** Forecast week number (1 to 13) for a date, counted from today. 0 means already due. */
export function weekFrom(today: string, date: string): number {
  const d = daysBetween(today, date);
  if (d < 0) return 1;
  return Math.floor(d / 7) + 1;
}

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function formatDate(value: string): string {
  return dayFormat.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return `${timeFormat.format(new Date(value))} UTC`;
}

/** "26 hours ago", "4 minutes ago". */
export function relativeTime(from: string, now: string): string {
  const mins = Math.max(0, Math.round(minutesBetween(from, now)));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
}
