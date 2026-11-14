import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge/Badge";
import { Button } from "@/components/ui/button/Button";
import { PERSONAS } from "@/data/world";
import { useTreasury } from "@/store/useTreasury";
import { TOUR, useTour } from "./tourState";

/** A small step card that walks the 6 step demo script. Skippable, keyboard friendly, never traps focus. */
export function GuidedTour() {
  const step = useTour((s) => s.step);
  const go = useTour((s) => s.go);
  const stop = useTour((s) => s.stop);
  const role = useTreasury((s) => s.role);
  const setRole = useTreasury((s) => s.setRole);
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLElement>(null);
  const current = step === null ? null : TOUR[step];

  useEffect(() => {
    if (!current) return;
    if (`${location.pathname}${location.search}` !== current.path) navigate(current.path);
    // Highlight the target once the page has rendered it.
    let tries = 0;
    let el: Element | null = null;
    const id = window.setInterval(() => {
      el = document.querySelector(`[data-tour="${current.target}"]`);
      tries += 1;
      if (el || tries > 20) {
        window.clearInterval(id);
        el?.classList.add("tour-target");
        el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }
    }, 100);
    return () => {
      window.clearInterval(id);
      document.querySelectorAll(".tour-target").forEach((n) => n.classList.remove("tour-target"));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== null) cardRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step === null) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stop();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [step, stop]);

  if (!current || step === null) return null;
  const last = step === TOUR.length - 1;

  return (
    <aside
      aria-label={`Guided demo, step ${step + 1} of ${TOUR.length}`}
      className="focus-ring fixed bottom-4 left-4 z-40 w-full max-w-sm rounded-habibiLg border border-brand-200 bg-white p-5 shadow-habibiLg"
      ref={cardRef}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant="brand">
          Step {step + 1} of {TOUR.length}
        </Badge>
        <button className="focus-ring rounded-habibiSm p-1 text-gray-500 hover:bg-gray-100" onClick={stop} type="button">
          <X aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">End guided demo</span>
        </button>
      </div>
      <h2 className="mt-3 text-base font-semibold text-gray-900">{current.title}</h2>
      <p className="mt-2 text-sm leading-6 text-gray-600">{current.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {current.role && current.role !== role ? (
          <Button onClick={() => setRole(current.role!)} size="sm" variant="secondaryColor">
            {current.roleLabel ?? `Switch to ${PERSONAS[current.role].name}`}
          </Button>
        ) : null}
        <div className="ml-auto flex gap-2">
          {step > 0 ? (
            <Button onClick={() => go(step - 1)} size="sm" variant="tertiaryGray">
              Back
            </Button>
          ) : null}
          <Button onClick={() => (last ? stop() : go(step + 1))} size="sm">
            {last ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </aside>
  );
}
