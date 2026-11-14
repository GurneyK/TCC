import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Drawer } from "@/components/ui/drawer/Drawer";
import { Sidebar } from "@/components/ui/layout/Sidebar";
import { RecordDrawer } from "@/features/shared/RecordDrawer";
import { useOpenFindings, useStaleSources } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { GuidedTour } from "./GuidedTour";
import { LiveRegion } from "./LiveRegion";
import { NAV } from "./nav";
import { PersonaBanner } from "./PersonaBanner";
import { ToastHost } from "./ToastHost";
import { TopBar } from "./TopBar";
import { useLiveFeed } from "./useLiveFeed";

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const open = useOpenFindings();
  const pending = useTreasury((s) => s.data.payments.filter((p) => p.status === "pending_approval" || p.status === "draft").length);
  const stale = useStaleSources();
  const counts = { exceptions: open.length, payments: pending, sources: stale.size };
  const items = useMemo(
    () =>
      NAV.map((n) => ({
        label: n.label,
        meta: n.meta,
        icon: n.icon,
        href: `#${n.path}`,
        active: n.path === "/" ? pathname === "/" : pathname.startsWith(n.path),
        count: n.count ? counts[n.count] : undefined,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname, counts.exceptions, counts.payments, counts.sources],
  );
  return (
    <div onClickCapture={(e) => (e.target as HTMLElement).closest("a") && onNavigate?.()}>
      <Sidebar items={items} navLabel="Main" subtitle="Lumen Brands Group" title="Treasury Command Center" />
    </div>
  );
}

export function AppShell() {
  useLiveFeed();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="min-h-screen text-gray-900">
      <a className="focus-ring sr-only z-50 rounded-habibiMd bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-habibiMd focus:not-sr-only focus:fixed focus:left-4 focus:top-4" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }}>
        Skip to main content
      </a>
      <div className="flex">
        <div className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-gray-200 bg-gray-50 p-4 lg:flex">
          <Nav />
          <p className="mt-auto px-2 text-xs leading-5 text-gray-600">Concept project by Gurnoor Kahlon. Synthetic data, no real money.</p>
        </div>
        <div className="min-w-0 flex-1">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          <div className="px-4 pt-4 sm:px-6 lg:px-8">
            <PersonaBanner />
          </div>
          <main className="px-4 py-6 outline-none sm:px-6 lg:px-8" id="main" tabIndex={-1}>
            <Outlet />
          </main>
          <footer className="border-t border-gray-200 px-4 py-6 text-sm text-gray-600 sm:px-6 lg:px-8">
            Concept project. All companies, banks, people and data are fictional.
          </footer>
        </div>
      </div>
      <Drawer onOpenChange={setMenuOpen} open={menuOpen} side="left" title="Menu">
        <Nav onNavigate={() => setMenuOpen(false)} />
      </Drawer>
      <RecordDrawer />
      <GuidedTour />
      <ToastHost />
      <LiveRegion />
    </div>
  );
}
