import { Menu, Pause, Play, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal/Modal";
import { SegmentedControl } from "@/components/ui/segmented-control/SegmentedControl";
import { Select } from "@/components/ui/select/Select";
import { StatusDot } from "@/components/ui/status-dot/StatusDot";
import type { Role } from "@/data/types";
import { PERSONAS } from "@/data/world";
import { formatDateTime } from "@/lib/dates";
import { useUi } from "@/store/hooks";
import { useTreasury } from "@/store/useTreasury";

export function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const role = useTreasury((s) => s.role);
  const setRole = useTreasury((s) => s.setRole);
  const now = useTreasury((s) => s.now);
  const sim = useTreasury((s) => s.sim);
  const setPaused = useTreasury((s) => s.setPaused);
  const setSpeed = useTreasury((s) => s.setSpeed);
  const reset = useTreasury((s) => s.reset);
  const notify = useUi((s) => s.notify);
  const [confirmReset, setConfirmReset] = useState(false);
  const roleId = useId();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button aria-label="Open menu" className="lg:hidden" onClick={onOpenMenu} size="icon" variant="secondaryGray" leadingIcon={<Menu aria-hidden="true" className="h-4 w-4" />} />
        <div className="mr-auto min-w-0">
          <p className="text-sm font-semibold text-gray-900">Lumen Brands Group</p>
          <p className="text-xs text-gray-600">
            <time dateTime={now}>{formatDateTime(now)}</time>
          </p>
        </div>

        <div aria-label="Demo controls" className="flex flex-wrap items-center gap-2" data-tour="demo-controls" role="group">
          <StatusDot label={sim.paused ? "Feed paused" : "Live feed"} tone={sim.paused ? "neutral" : "success"} />
          <Button
            leadingIcon={sim.paused ? <Play aria-hidden="true" className="h-4 w-4" /> : <Pause aria-hidden="true" className="h-4 w-4" />}
            onClick={() => setPaused(!sim.paused)}
            size="sm"
            variant="secondaryGray"
          >
            {sim.paused ? "Resume live feed" : "Pause live feed"}
          </Button>
          <SegmentedControl
            label="Feed speed"
            onChange={(v) => setSpeed(v === "4" ? 4 : 1)}
            segments={[
              { label: "1x", value: "1" },
              { label: "4x", value: "4" },
            ]}
            value={String(sim.speed)}
          />
          <Button leadingIcon={<RotateCcw aria-hidden="true" className="h-4 w-4" />} onClick={() => setConfirmReset(true)} size="sm" variant="tertiaryGray">
            Reset demo
          </Button>
        </div>

        <div className="flex items-center gap-2" data-tour="role">
          <label className="text-sm font-medium text-gray-700" htmlFor={roleId}>
            Viewing as
          </label>
          <div className="w-60">
            <Select id={roleId} onChange={(e) => setRole(e.target.value as Role)} value={role}>
              {(Object.keys(PERSONAS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {PERSONAS[r].name}, {PERSONAS[r].title}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <Modal
        description="This reseeds the data and clears every approval, finding decision, upload and audit entry you made."
        footer={
          <>
            <Button onClick={() => setConfirmReset(false)} variant="secondaryGray">
              Cancel
            </Button>
            <Button
              onClick={() => {
                reset();
                setConfirmReset(false);
                notify("Demo reset", "Fresh data from the same seed. Everything replays the same way.", "info");
              }}
              variant="destructive"
            >
              Reset demo
            </Button>
          </>
        }
        onOpenChange={setConfirmReset}
        open={confirmReset}
        title="Reset the demo?"
      >
        <p className="text-sm leading-6 text-gray-600">You will start again as {PERSONAS.analyst.name} at 09:00 UTC on 12 November 2026.</p>
      </Modal>
    </header>
  );
}
