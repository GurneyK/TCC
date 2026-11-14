import { BarChart3, Home, MessageSquareText, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
  active?: boolean;
  label: string;
  meta?: string;
  /** When set the item renders as a link and gets aria-current when active. */
  href?: string;
  icon?: LucideIcon;
  /** Small count shown on the right, like open findings. */
  count?: number;
};

export interface SidebarProps {
  items?: SidebarItem[];
  title?: string;
  subtitle?: string;
  /** Visible label for the nav landmark. Defaults to the title. */
  navLabel?: string;
}

const defaultItems: SidebarItem[] = [
  { active: true, label: "Overview", meta: "Workspace home" },
  { label: "Agent chat", meta: "Conversations" },
  { label: "Analytics", meta: "Reports" },
  { label: "Settings", meta: "Admin" },
];

const icons = [Home, MessageSquareText, BarChart3, Settings];

export function Sidebar({ items = defaultItems, navLabel, subtitle = "Workspace navigation", title = "Design Library" }: SidebarProps) {
  return (
    <aside className="w-full max-w-xs rounded-habibiLg border border-gray-200 bg-white p-3 shadow-habibiXs">
      <div className="border-b border-gray-200 px-2 pb-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>
      <nav aria-label={navLabel ?? title} className="mt-3 space-y-1">
        {items.map((item, index) => {
          const Icon = item.icon ?? icons[index] ?? Home;
          const className = [
            "focus-ring flex w-full items-center gap-3 rounded-habibiMd px-3 py-2.5 text-left",
            item.active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50",
          ].join(" ");
          const body = (
            <>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{item.label}</span>
                {item.meta ? <span className="block truncate text-xs text-gray-500">{item.meta}</span> : null}
              </span>
              {item.count ? (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                  {item.count}
                  <span className="sr-only"> open</span>
                </span>
              ) : null}
            </>
          );

          return item.href ? (
            <a aria-current={item.active ? "page" : undefined} className={className} href={item.href} key={item.label}>
              {body}
            </a>
          ) : (
            <button className={className} key={item.label} type="button">
              {body}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
