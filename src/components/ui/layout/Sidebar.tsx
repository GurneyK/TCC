import { BarChart3, Home, MessageSquareText, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarItem = {
  active?: boolean;
  label: string;
  meta?: string;
  /** When set the item renders as a link and gets aria-current when active. */
  href?: string;
  icon?: LucideIcon;
  /** Small count shown on the right, like open findings. */
  count?: number;
  /** Colour of the count pill. Defaults to neutral. */
  countTone?: "neutral" | "brand" | "warning" | "error";
  /** Screen reader word after the count. Defaults to "open". */
  countLabel?: string;
};

export type SidebarSection = {
  label?: string;
  items: SidebarItem[];
};

export interface SidebarProps {
  items?: SidebarItem[];
  /** Grouped items with optional section labels. Takes over from items when set. */
  sections?: SidebarSection[];
  title?: string;
  subtitle?: string;
  /** Visible label for the nav landmark. Defaults to the title. */
  navLabel?: string;
  /** Replaces the title block, for a logo lockup. */
  header?: ReactNode;
  /** Pinned to the bottom, for the signed in user. */
  footer?: ReactNode;
  /** card is the floating default. panel fills its column edge to edge. */
  variant?: "card" | "panel";
}

const defaultItems: SidebarItem[] = [
  { active: true, label: "Overview", meta: "Workspace home" },
  { label: "Agent chat", meta: "Conversations" },
  { label: "Analytics", meta: "Reports" },
  { label: "Settings", meta: "Admin" },
];

const icons = [Home, MessageSquareText, BarChart3, Settings];

const countClasses: Record<NonNullable<SidebarItem["countTone"]>, string> = {
  neutral: "bg-gray-100 text-gray-700",
  brand: "bg-brand-100 text-brand-700",
  warning: "bg-warning-100 text-warning-700",
  error: "bg-error-100 text-error-700",
};

function Item({ index, item }: { index: number; item: SidebarItem }) {
  const Icon = item.icon ?? icons[index] ?? Home;
  const className = [
    "focus-ring flex w-full items-center gap-3 rounded-habibiMd px-3 py-2.5 text-left transition-colors",
    item.active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
  ].join(" ");
  const body = (
    <>
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{item.label}</span>
        {item.meta ? <span className="block truncate text-xs text-gray-500">{item.meta}</span> : null}
      </span>
      {item.count ? (
        <span className={["rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", countClasses[item.countTone ?? "neutral"]].join(" ")}>
          {item.count}
          <span className="sr-only"> {item.countLabel ?? "open"}</span>
        </span>
      ) : null}
    </>
  );

  return item.href ? (
    <a aria-current={item.active ? "page" : undefined} className={className} href={item.href}>
      {body}
    </a>
  ) : (
    <button className={className} type="button">
      {body}
    </button>
  );
}

export function Sidebar({
  footer,
  header,
  items = defaultItems,
  navLabel,
  sections,
  subtitle = "Workspace navigation",
  title = "Design Library",
  variant = "card",
}: SidebarProps) {
  const groups = sections ?? [{ items }];
  const panel = variant === "panel";
  let index = 0;

  return (
    <aside
      className={
        panel
          ? "flex h-full w-full flex-col bg-white"
          : "w-full max-w-xs rounded-habibiLg border border-gray-200 bg-white p-3 shadow-habibiXs"
      }
    >
      {header ?? (
        <div className="border-b border-gray-200 px-2 pb-3">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>
      )}
      <nav aria-label={navLabel ?? title} className={panel ? "scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 py-4" : "mt-3 space-y-1"}>
        {groups.map((group, g) => (
          <div className="space-y-1" key={group.label ?? g}>
            {group.label ? <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</p> : null}
            {group.items.map((item) => (
              <Item index={index++} item={item} key={item.label} />
            ))}
          </div>
        ))}
      </nav>
      {footer ? <div className={panel ? "border-t border-gray-200 p-3" : "mt-3 border-t border-gray-200 pt-3"}>{footer}</div> : null}
    </aside>
  );
}
