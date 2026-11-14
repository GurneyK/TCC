import type { ReactNode } from "react";
import { BAR_TONES } from "./tones";

export interface BarListRow {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /** 0 to 100, width of the bar. */
  percent: number;
  tone?: string;
  note?: ReactNode;
}

/** Labelled horizontal bars. The numbers are real text, so the list reads fine without the bars. */
export function BarList({ rows, label }: { rows: BarListRow[]; label: string }) {
  return (
    <ul aria-label={label} className="space-y-3.5">
      {rows.map((r, i) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-gray-700">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-gray-900">{r.value}</span>
          </div>
          <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className={["animate-grow h-full rounded-full", r.tone ?? BAR_TONES[i % BAR_TONES.length]].join(" ")}
              style={{ width: `${Math.max(2, Math.min(100, r.percent))}%`, animationDelay: `${i * 60}ms` }}
            />
          </div>
          {r.note ? <div className="mt-1 text-xs text-gray-500">{r.note}</div> : null}
        </li>
      ))}
    </ul>
  );
}
