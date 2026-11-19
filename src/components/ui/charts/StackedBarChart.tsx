export interface StackedSegment {
  label: string;
  /** Share of the bar, 0 to 100. */
  percent: number;
  tone: "brand" | "info" | "success" | "warning" | "error" | "neutral";
}

export interface StackedBar {
  label: string;
  segments: StackedSegment[];
  /** Optional marker drawn across the bar, 0 to 100. Used for policy targets. */
  marker?: number;
}

export interface StackedBarChartProps {
  ariaLabel?: string;
  bars?: StackedBar[];
}

const toneClass: Record<StackedSegment["tone"], string> = {
  brand: "bg-brand-700",
  info: "bg-info-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  error: "bg-error-500",
  neutral: "bg-gray-300",
};

const defaultBars: StackedBar[] = [
  { label: "Mon", segments: [{ label: "A", percent: 58, tone: "brand" }, { label: "B", percent: 25, tone: "info" }, { label: "C", percent: 17, tone: "success" }] },
  { label: "Tue", segments: [{ label: "A", percent: 50, tone: "brand" }, { label: "B", percent: 33, tone: "info" }, { label: "C", percent: 17, tone: "success" }] },
  { label: "Wed", segments: [{ label: "A", percent: 67, tone: "brand" }, { label: "B", percent: 17, tone: "info" }, { label: "C", percent: 16, tone: "success" }] },
  { label: "Thu", segments: [{ label: "A", percent: 42, tone: "brand" }, { label: "B", percent: 42, tone: "info" }, { label: "C", percent: 16, tone: "success" }] },
];

export function StackedBarChart({ ariaLabel = "Stacked bar chart", bars = defaultBars }: StackedBarChartProps) {
  return (
    <div aria-label={ariaLabel} className="space-y-4" role="img">
      {bars.map((bar) => (
        <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3" key={bar.label}>
          <span className="text-xs font-medium text-gray-500">{bar.label}</span>
          <div className="relative flex h-8 overflow-hidden rounded-h3lMd bg-gray-100">
            {bar.segments.map((segment, index) => (
              <span className={toneClass[segment.tone]} key={`${bar.label}-${index}`} style={{ width: `${Math.max(0, Math.min(100, segment.percent))}%` }} />
            ))}
            {bar.marker !== undefined ? (
              <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-gray-900" style={{ left: `${Math.min(99.5, bar.marker)}%` }} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
