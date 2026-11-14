import { ArrowLeftRight, Bot, Building2, Database, LayoutDashboard, LineChart, ScrollText, ShieldAlert, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavEntry {
  path: string;
  label: string;
  icon: LucideIcon;
  count?: "exceptions" | "payments" | "sources";
}

export interface NavGroup {
  label: string;
  items: NavEntry[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Today",
    items: [
      { path: "/", label: "Hub", icon: LayoutDashboard },
      { path: "/exceptions", label: "Exceptions", icon: ShieldAlert, count: "exceptions" },
      { path: "/payments", label: "Payments", icon: Send, count: "payments" },
    ],
  },
  {
    label: "Cash and risk",
    items: [
      { path: "/cash", label: "Cash positions", icon: Building2 },
      { path: "/forecast", label: "Cash forecast", icon: LineChart },
      { path: "/fx", label: "FX exposure", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Controls",
    items: [
      { path: "/agents", label: "Agents", icon: Bot },
      { path: "/sources", label: "Data sources", icon: Database, count: "sources" },
      { path: "/audit", label: "Audit log", icon: ScrollText },
    ],
  },
];

export const NAV: NavEntry[] = NAV_GROUPS.flatMap((g) => g.items);

export function navEntryFor(pathname: string): NavEntry | undefined {
  return NAV.find((n) => (n.path === "/" ? pathname === "/" : pathname.startsWith(n.path)));
}
