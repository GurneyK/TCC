import { ArrowLeftRight, Bot, Building2, Database, LayoutDashboard, LineChart, ScrollText, ShieldAlert, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavEntry {
  path: string;
  label: string;
  meta: string;
  icon: LucideIcon;
  count?: "exceptions" | "payments" | "sources";
}

export const NAV: NavEntry[] = [
  { path: "/", label: "Hub", meta: "Today at a glance", icon: LayoutDashboard },
  { path: "/exceptions", label: "Exceptions", meta: "Agent findings", icon: ShieldAlert, count: "exceptions" },
  { path: "/payments", label: "Payments", meta: "Approvals and release", icon: Send, count: "payments" },
  { path: "/cash", label: "Cash positions", meta: "Every bank account", icon: Building2 },
  { path: "/forecast", label: "Cash forecast", meta: "13 weeks ahead", icon: LineChart },
  { path: "/fx", label: "FX exposure", meta: "Hedge policy", icon: ArrowLeftRight },
  { path: "/agents", label: "Agents", meta: "Runs and rules", icon: Bot },
  { path: "/sources", label: "Data sources", meta: "Feeds and uploads", icon: Database, count: "sources" },
  { path: "/audit", label: "Audit log", meta: "Who did what", icon: ScrollText },
];
