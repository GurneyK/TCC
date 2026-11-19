import { Bell, ChevronRight, Menu, Pause, Play } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button/Button";
import { formatDateTime } from "@/lib/dates";
import { useOpenFindings } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { navEntryFor } from "./nav";

function LiveStatus() {
  const now = useTreasury((s) => s.now);
  const sim = useTreasury((s) => s.sim);
  const setPaused = useTreasury((s) => s.setPaused);
  return (
    <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white py-1 pl-3 pr-1 shadow-h3lXs">
      <span aria-hidden="true" className={["h-2 w-2 rounded-full", sim.paused ? "bg-gray-400" : "live-pulse bg-success-500"].join(" ")} />
      <span className="ml-1 text-xs font-semibold text-gray-900">{sim.paused ? "Paused" : "Live"}</span>
      <span className="hidden text-xs text-gray-500 sm:inline">
        <span aria-hidden="true"> · </span>
        <time dateTime={now}>{formatDateTime(now)}</time>
      </span>
      <button
        aria-label={sim.paused ? "Resume live feed" : "Pause live feed"}
        className="focus-ring ml-1 flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        onClick={() => setPaused(!sim.paused)}
        title={sim.paused ? "Resume live feed" : "Pause live feed"}
        type="button"
      >
        {sim.paused ? <Play aria-hidden="true" className="h-3.5 w-3.5" /> : <Pause aria-hidden="true" className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Alerts() {
  const open = useOpenFindings();
  const critical = open.filter((f) => f.severity === "critical").length;
  return (
    <a
      aria-label={critical ? `${critical} critical findings. Open exceptions` : "No critical findings. Open exceptions"}
      className="focus-ring relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-h3lXs transition-colors hover:text-gray-900"
      href="#/exceptions"
    >
      <Bell aria-hidden="true" className="h-4 w-4" />
      {critical ? (
        <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-600 text-xs font-semibold leading-none text-white">
          {critical}
        </span>
      ) : null}
    </a>
  );
}

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { pathname } = useLocation();
  const section = navEntryFor(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex h-16 items-center gap-3">
        <Button aria-label="Open menu" className="lg:hidden" onClick={onOpenMenu} size="icon" variant="secondaryGray" leadingIcon={<Menu aria-hidden="true" className="h-4 w-4" />} />
        <nav aria-label="Breadcrumb" className="mr-auto min-w-0">
          <ol className="flex items-center gap-1.5 text-sm">
            <li className="hidden truncate text-gray-500 sm:block">Lumen Brands Group</li>
            <li aria-hidden="true" className="hidden text-gray-300 sm:block">
              <ChevronRight className="h-4 w-4" />
            </li>
            <li aria-current="page" className="truncate font-semibold text-gray-900">
              {section?.label ?? "Not found"}
            </li>
          </ol>
        </nav>
        <LiveStatus />
        <Alerts />
      </div>
    </header>
  );
}
