export type Segment = {
  active?: boolean;
  label: string;
  value: string;
};

export interface SegmentedControlProps {
  label?: string;
  segments?: Segment[];
  /** Controlled value. When set, overrides each segment's `active`. */
  value?: string;
  onChange?: (value: string) => void;
}

const defaultSegments: Segment[] = [
  { active: true, label: "Components", value: "components" },
  { label: "Templates", value: "templates" },
  { label: "Agents", value: "agents" },
];

export function SegmentedControl({ label = "View", onChange, segments = defaultSegments, value }: SegmentedControlProps) {
  return (
    <div aria-label={label} role="group">
      <div className="inline-grid rounded-h3lMd bg-gray-100 p-1 text-sm font-semibold text-gray-600" style={{ gridTemplateColumns: `repeat(${segments.length}, minmax(0, 1fr))` }}>
        {segments.map((segment) => {
          const active = value !== undefined ? value === segment.value : segment.active;
          return (
            <button
              aria-pressed={Boolean(active)}
              className={[
                "focus-ring rounded-h3lSm px-3 py-2 transition-colors",
                active ? "bg-white text-gray-900 shadow-h3lXs" : "hover:text-gray-900",
              ].join(" ")}
              key={segment.value}
              onClick={() => onChange?.(segment.value)}
              type="button"
            >
              {segment.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
