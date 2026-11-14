export interface WaterfallStep {
  label: string;
  value: number;
  type: "total" | "increase" | "decrease";
}

export interface WaterfallChartProps {
  ariaLabel?: string;
  steps?: WaterfallStep[];
  /** Sizing classes. Use "h-auto w-full" to scale with the card width. */
  className?: string;
}

const defaultSteps: WaterfallStep[] = [
  { label: "Base", value: 84, type: "total" },
  { label: "New", value: 36, type: "increase" },
  { label: "Fixes", value: 18, type: "increase" },
  { label: "Drop", value: -24, type: "decrease" },
  { label: "Final", value: 114, type: "total" },
];

const BASELINE = 164;
const PLOT_HEIGHT = 140;
const LEFT = 34;
const SLOT_MIN = 64;

export function WaterfallChart({ ariaLabel = "Waterfall chart", className = "h-48 w-full", steps = defaultSteps }: WaterfallChartProps) {
  // The plot widens with the number of steps so labels never collide.
  const width = Math.max(400, LEFT * 2 + steps.length * SLOT_MIN);
  const right = width - 30;

  // Walk the steps once to find the range, so any magnitude fits the plot.
  let walk = 0;
  const levels: number[] = [0];
  steps.forEach((step) => {
    walk = step.type === "total" ? step.value : walk + step.value;
    levels.push(walk);
  });
  const lo = Math.min(0, ...levels);
  const hi = Math.max(...levels, 1);
  const scale = PLOT_HEIGHT / (hi - lo || 1);
  const py = (v: number) => BASELINE - (v - lo) * scale;
  const slot = (right - LEFT) / Math.max(steps.length, 1);
  const barWidth = Math.min(36, slot * 0.6);

  let running = 0;

  return (
    <svg aria-label={ariaLabel} className={className} role="img" viewBox={`0 0 ${width} 190`}>
      {[42, 82, 122, 162].map((y) => (
        <line className="stroke-gray-100" key={y} strokeWidth="1" x1={LEFT} x2={right} y1={y} y2={y} />
      ))}
      {steps.map((step, index) => {
        const previous = running;
        running = step.type === "total" ? step.value : running + step.value;
        const start = step.type === "total" ? 0 : previous;
        const end = running;
        const top = Math.max(start, end);
        const bottom = Math.min(start, end);
        const x = LEFT + index * slot + (slot - barWidth) / 2;
        const y = py(top);
        const height = Math.max((top - bottom) * scale, 4);
        const fill =
          step.type === "total" ? "fill-brand-700" : step.type === "decrease" ? "fill-error-500" : "fill-success-500";

        return (
          <g key={step.label}>
            {index > 0 && (
              <line className="stroke-gray-300" strokeDasharray="4 4" strokeWidth="1.5" x1={x - (slot - barWidth)} x2={x} y1={py(start)} y2={py(start)} />
            )}
            <rect className={fill} height={height} rx="6" width={barWidth} x={x} y={y} />
            <text className="fill-gray-500 text-[10px] font-medium" textAnchor="middle" x={x + barWidth / 2} y="182">
              {step.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
