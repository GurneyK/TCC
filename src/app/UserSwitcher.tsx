import { Check, ChevronsUpDown, Users } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar/Avatar";
import { Button } from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal/Modal";
import { UserMenu } from "@/components/ui/navigation/UserMenu";
import { SegmentedControl } from "@/components/ui/segmented-control/SegmentedControl";
import type { Role } from "@/data/types";
import { useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";
import { PERSONA_META, ROLES } from "./personas";
import { useTour } from "./tourState";

/** Signed in user, bottom left. Opens upward to switch role and reach demo settings. */
export function UserSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const role = useTreasury((s) => s.role);
  const setRole = useTreasury((s) => s.setRole);
  const speed = useTreasury((s) => s.sim.speed);
  const setSpeed = useTreasury((s) => s.setSpeed);
  const reset = useTreasury((s) => s.reset);
  const notify = useUi((s) => s.notify);
  const startTour = useTour((s) => s.start);
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const me = PERSONA_META[role];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (r: Role) => {
    setOpen(false);
    button.current?.focus();
    if (r === role) return;
    setRole(r);
    notify(`Signed in as ${PERSONA_META[r].name}`, PERSONA_META[r].can + ".", "info");
  };

  return (
    <div className="relative" ref={wrap}>
      {open ? (
        <div className="animate-pop absolute bottom-full left-0 right-0 z-40 mb-2">
          <UserMenu
            aria-label="Switch user"
            className="max-w-none shadow-habibiLg"
            footer={
              <div className="space-y-3 border-t border-gray-200 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-600">Feed speed</span>
                  <SegmentedControl
                    label="Feed speed"
                    onChange={(v) => setSpeed(v === "4" ? 4 : 1)}
                    segments={[
                      { label: "1x", value: "1" },
                      { label: "4x", value: "4" },
                    ]}
                    value={String(speed)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                      startTour();
                    }}
                    className="w-full"
                    size="sm"
                    variant="secondaryGray"
                  >
                    Guided tour
                  </Button>
                  <Button                    onClick={() => {
                      setOpen(false);
                      setConfirmReset(true);
                    }}
                    className="w-full"
                    size="sm"
                    variant="secondaryGray"
                  >
                    Reset data
                  </Button>
                </div>
              </div>
            }
            header={
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Switch user</p>
                <p className="mt-0.5 text-xs text-gray-600">Each role sees different actions.</p>
              </div>
            }
            id={menuId}
          >
            <ul className="space-y-1">
              {ROLES.map((r) => {
                const p = PERSONA_META[r];
                const current = r === role;
                return (
                  <li key={r}>
                    <button
                      aria-current={current ? "true" : undefined}
                      className={[
                        "focus-ring flex w-full items-center gap-3 rounded-habibiMd px-3 py-2 text-left transition-colors",
                        current ? "bg-brand-50" : "hover:bg-gray-50",
                      ].join(" ")}
                      onClick={() => choose(r)}
                      type="button"
                    >
                      <Avatar initials={p.initials} tone={p.tone} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{p.name}</span>
                        <span className="block truncate text-xs text-gray-600">{p.title}</span>
                      </span>
                      {current ? <Check aria-label="Current user" className="h-4 w-4 shrink-0 text-brand-700" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </UserMenu>
        </div>
      ) : null}

      <p className="mb-2 flex items-center gap-2 rounded-habibiMd bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
        <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        Switch user to see another role
      </p>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-label={`Signed in as ${me.name}, ${me.title}. Switch user`}
        className="focus-ring flex w-full items-center gap-3 rounded-habibiMd px-2 py-2 text-left transition-colors hover:bg-gray-50"
        data-tour="role"
        onClick={() => setOpen((o) => !o)}
        ref={button}
        type="button"
      >
        <Avatar initials={me.initials} status="online" tone={me.tone} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-gray-900">{me.name}</span>
          <span className="block truncate text-xs text-gray-600">{me.title}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="h-4 w-4 shrink-0 text-gray-500" />
      </button>

      <Modal
        description="This reseeds the data and clears every approval, decision, upload and audit entry made since."
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)} variant="secondaryGray">
              Cancel
            </Button>
            <Button
              onClick={() => {
                reset();
                setConfirmReset(false);
                notify("Data reset", "Fresh data from the same seed.", "info");
              }}
              variant="destructive"
            >
              Reset data
            </Button>
          </>
        }
        onOpenChange={setConfirmReset}
        open={confirmReset}
        title="Reset all data?"
      >
        <p className="text-sm leading-6 text-gray-600">You will start again as {PERSONA_META.analyst.name} at 09:00 UTC on 12 November 2026.</p>
      </Modal>
    </div>
  );
}
