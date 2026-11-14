import { Landmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Drawer } from "@/components/ui/drawer/Drawer";
import { Sidebar } from "@/components/ui/layout/Sidebar";
import type { Role } from "@/data/types";
import { RecordDrawer } from "@/features/shared/RecordDrawer";
import { useOpenFindings, useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { GuidedTour } from "./GuidedTour";
import { LiveRegion } from "./LiveRegion";
import { NAV_GROUPS } from "./nav";
import { ROLES } from "./personas";
import { ToastHost } from "./ToastHost";
import { TopBar } from "./TopBar";
import { TourBanner } from "./TourBanner";
import { useTour } from "./tourState";
import { useLiveFeed } from "./useLiveFeed";
import { UserSwitcher } from "./UserSwitcher";

function Logo() {
  return (
    <a className="focus-ring flex items-center gap-3 rounded-habibiMd border-b border-gray-200 px-5 py-4" href="#/">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-habibiMd bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-habibiSm">
        <Landmark aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-gray-900">Lumen Treasury</span>
        <span className="block truncate text-xs text-gray-500">Command Center</span>
      </span>
    </a>
  );
}

function SideNav({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const { pathname } = useLocation();
  const open = useOpenFindings();
  const pending = useTreasury((s) => s.data.payments.filter((p) => p.status === "pending_approval").length);
  const stale = useStaleSources();
  const urgent = open.some((f) => f.severity === "critical");
  const counts = { exceptions: open.length, payments: pending, sources: stale.size };
  const sections = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        label: g.label,
        items: g.items.map((n) => ({
          label: n.label,
          icon: n.icon,
          href: `#${n.path}`,
          active: n.path === "/" ? pathname === "/" : pathname.startsWith(n.path),
          count: n.count ? counts[n.count] : undefined,
          countTone: n.count === "exceptions" ? (urgent ? ("error" as const) : ("warning" as const)) : n.count === "sources" ? ("warning" as const) : ("brand" as const),
          countLabel: n.count === "payments" ? "waiting for approval" : n.count === "sources" ? "delayed" : "open",
        })),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, counts.exceptions, counts.payments, counts.sources, urgent],
  );
  return (
    <div className="h-full" onClickCapture={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()}>
      <Sidebar footer={<UserSwitcher onNavigate={onNavigate} />} header={compact ? <></> : <Logo />} navLabel="Main" sections={sections} variant="panel" />
    </div>
  );
}

/** Deep links from outside: ?tour=1 starts the guided tour, ?as=treasurer signs in as that role. */
function useEntryParams() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const setRole = useTreasury((s) => s.setRole);
  const start = useTour((s) => s.start);
  useEffect(() => {
    const params = new URLSearchParams(search);
    const as = params.get("as");
    const tour = params.get("tour");
    if (!as && !tour) return;
    if (as && (ROLES as string[]).includes(as)) setRole(as as Role);
    params.delete("as");
    params.delete("tour");
    const rest = params.toString();
    navigate(`${pathname}${rest ? `?${rest}` : ""}`, { replace: true });
    if (tour) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
}

export function AppShell() {
  useLiveFeed();
  useEntryParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <a className="focus-ring sr-only z-50 rounded-habibiMd bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-habibiMd focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Skip to main content
      </a>
      <div className="flex">
        <div className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 lg:block">
          <SideNav />
        </div>
        <div className="min-w-0 flex-1">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          <TourBanner />
          <main className="mx-auto max-w-screen-2xl px-4 pb-12 pt-6 outline-none sm:px-6 lg:px-8" id="main" tabIndex={-1}>
            <div className="animate-rise" key={pathname}>
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <Drawer onOpenChange={setMenuOpen} open={menuOpen} description="Command Center" side="left" title="Lumen Treasury">
        <div className="-m-6">
          <SideNav compact onNavigate={() => setMenuOpen(false)} />
        </div>
      </Drawer>
      <RecordDrawer />
      <GuidedTour />
      <ToastHost />
      <LiveRegion />
    </div>
  );
}
