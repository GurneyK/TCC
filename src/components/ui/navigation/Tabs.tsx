export type TabItem = {
  active?: boolean;
  count?: number;
  label: string;
  value?: string;
};

export interface TabsProps {
  items?: TabItem[];
  ariaLabel?: string;
  /** Called with the tab's value (or label when no value is set). */
  onSelect?: (value: string) => void;
}

const defaultItems: TabItem[] = [
  { active: true, count: 12, label: "Overview" },
  { count: 4, label: "Runs" },
  { label: "Sources" },
  { label: "Settings" },
];

export function Tabs({ ariaLabel = "Sections", items = defaultItems, onSelect }: TabsProps) {
  return (
    <div className="scrollbar-none overflow-x-auto">
      <div className="w-max min-w-full border-b border-gray-200">
      <div aria-label={ariaLabel} className="-mb-px flex gap-4" role="tablist">
        {items.map((item) => (
          <button
            aria-selected={Boolean(item.active)}
            className={[
              "focus-ring inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-semibold",
              item.active ? "border-brand-700 text-brand-700" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
            ].join(" ")}
            key={item.label}
            onClick={() => onSelect?.(item.value ?? item.label)}
            role="tab"
            type="button"
          >
            {item.label}
            {item.count !== undefined ? (
              <span className={["rounded-full px-2 py-0.5 text-xs", item.active ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"].join(" ")}>
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
