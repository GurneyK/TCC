import { ArrowRight, Sparkles, X } from "lucide-react";
import { useTreasury } from "@/store/useTreasury";
import { TOUR, useTour } from "./tourState";

/** The guided tour invitation under the top bar. Dismissed for good, restart it from the user menu. */
export function TourBanner() {
  const dismissed = useTreasury((s) => s.dismissedTour);
  const dismiss = useTreasury((s) => s.dismissTour);
  const start = useTour((s) => s.start);
  const active = useTour((s) => s.step !== null);
  if (dismissed || active) return null;

  return (
    <section aria-label="Guided tour" className="px-4 pt-4 sm:px-6 lg:px-8">
      <div className="animate-rise relative mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden rounded-habibiLg bg-gradient-to-r from-brand-800 via-brand-700 to-info-600 px-4 py-3 text-white shadow-habibiSm sm:px-5">
        <div aria-hidden="true" className="sheen pointer-events-none absolute inset-0" />
        <span className="relative hidden h-9 w-9 shrink-0 items-center justify-center rounded-habibiMd bg-white/15 sm:flex">
          <Sparkles aria-hidden="true" className="h-5 w-5" />
        </span>
        <p className="relative min-w-0 flex-1 text-sm leading-5">
          <span className="font-semibold">Take the {TOUR.length} step tour.</span>{" "}
          <span className="text-brand-100">Watch an agent catch a payment fraud, then see who is allowed to approve it.</span>
        </p>
        <button
          className="focus-ring relative order-last inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-habibiMd bg-white px-3 py-2 sm:order-none sm:w-auto sm:py-1.5 text-sm font-semibold text-brand-800 shadow-habibiXs transition-transform hover:translate-x-0.5"
          onClick={start}
          type="button"
        >
          Start tour
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label="Hide the tour invitation"
          className="focus-ring relative shrink-0 self-start rounded-habibiSm p-1 text-brand-100 sm:self-center transition-colors hover:bg-white/15 hover:text-white"
          onClick={() => dismiss(true)}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
