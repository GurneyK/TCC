import { chartTokens } from "./chartTokens";

export interface LineSeries {
  label: string;
  values: number[];
  /** Brand for the primary line, info for a comparison line. */
  tone?: "brand" | "info";
  dashed?: boolean;
}

export interface LineThreshold {
  label: string;
  value: number;
}

export interface LineChartProps {
  ariaLabel?: string;
  series?: LineSeries[];
  xLabels?: string[];
  threshold?: LineThreshold;
  /** Formats y axis ticks. */
  formatValue?: (value: number) => string;
  /** Sizing classes. Use "h-auto w-full" to scale with the card width. */
  className?: string;
  /** Width of the drawing in chart units. Height stays 180, so a larger width gives a wider, flatter chart. */
  width?: number;
  /** Soft fill under the first line. */
  area?: boolean;
}

const defaultSeries: LineSeries[] = [{ label: "Series", values: [48, 68, 62, 102, 94, 128, 120] }];

const H = 180;
const LEFT = 30;
const TOP = 20;
const BOTTOM = 160;

export function LineChart({ area = false, ariaLabel = "Line chart", className = "h-48 w-full", formatValue, series = defaultSeries, threshold, width = 360, xLabels }: LineChartProps) {
  const W = width;
  const RIGHT = W - 20;
  const all = series.flatMap((s) => s.values).concat(threshold ? [threshold.value] : []);
  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const pad = (rawMax - rawMin || Math.abs(rawMax) || 1) * 0.12;
  const min = rawMin - pad;
  const max = rawMax + pad;
  const count = Math.max(...series.map((s) => s.values.length), 2);
  const x = (i: number) => LEFT + 5 + (i * (RIGHT - LEFT - 10)) / (count - 1);
  const y = (v: number) => BOTTOM - ((v - min) / (max - min)) * (BOTTOM - TOP);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * (i + 0.5)) / 4);

  return (
    <svg aria-label={ariaLabel} className={className} role="img" viewBox={`${formatValue ? -34 : 0} 0 ${W + (formatValue ? 34 : 0)} ${H + (xLabels ? 16 : 0)}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line stroke={chartTokens.grid} strokeWidth="1" x1={LEFT} x2={RIGHT} y1={y(t)} y2={y(t)} />
          {formatValue ? (
            <text className="fill-gray-500 text-[10px]" textAnchor="end" x={LEFT - 6} y={y(t) + 3}>
              {formatValue(t)}
            </text>
          ) : null}
        </g>
      ))}
      {threshold ? (
        <g>
          <line className="stroke-error-500" strokeDasharray="5 4" strokeWidth="1.5" x1={LEFT} x2={RIGHT} y1={y(threshold.value)} y2={y(threshold.value)} />
          <text className="fill-error-700 text-[10px] font-medium" textAnchor="end" x={RIGHT} y={y(threshold.value) - 5}>
            {threshold.label}
          </text>
        </g>
      ) : null}
      {area && series[0] ? (
        <polygon
          className="animate-rise"
          fill={series[0].tone === "info" ? chartTokens.info : chartTokens.brand}
          fillOpacity="0.08"
          points={`${x(0)},${BOTTOM} ${series[0].values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} ${x(series[0].values.length - 1)},${BOTTOM}`}
        />
      ) : null}
      {series.map((s) => {
        const stroke = s.tone === "info" ? chartTokens.info : chartTokens.brand;
        const points = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
        return (
          <g key={s.label}>
            <polyline
              className={s.dashed ? "animate-rise" : "draw-line"}
              fill="none"
              pathLength={s.dashed ? undefined : 1}
              points={points}
              stroke={stroke}
              strokeDasharray={s.dashed ? "6 5" : undefined}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            />
            {s.values.map((v, i) => (
              <circle
                className={threshold && v < threshold.value ? "stroke-error-600" : undefined}
                cx={x(i)}
                cy={y(v)}
                fill="white"
                key={i}
                r="4"
                stroke={threshold && v < threshold.value ? undefined : stroke}
                strokeWidth="2"
              />
            ))}
          </g>
        );
      })}
      {xLabels
        ? xLabels.map((label, i) => (
            <text className="fill-gray-500 text-[10px] font-medium" key={label} textAnchor="middle" x={x(i)} y={H + 8}>
              {label}
            </text>
          ))
        : null}
    </svg>
  );
}
