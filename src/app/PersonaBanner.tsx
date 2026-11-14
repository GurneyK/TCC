import { PlayCircle } from "lucide-react";
import { Banner } from "@/components/ui/banner/Banner";
import { Button } from "@/components/ui/button/Button";
import type { Role } from "@/data/types";
import { useActor } from "@/store/hooks";
import { useTour } from "./tourState";

const CAN: Record<Role, string> = {
  analyst: "You can act on findings, create drafts and submit payments. Approvals need the Group Treasurer.",
  treasurer: "You approve, reject and release payments. You can't approve a payment you created.",
  auditor: "Read only. You see every record and the full audit trail, with no action buttons.",
};

export function PersonaBanner() {
  const actor = useActor();
  const startTour = useTour((s) => s.start);
  const tourActive = useTour((s) => s.step !== null);
  return (
    <Banner
      action={
        tourActive ? null : (
          <Button leadingIcon={<PlayCircle aria-hidden="true" className="h-4 w-4" />} onClick={startTour} size="sm" variant="secondaryColor">
            Start guided demo
          </Button>
        )
      }
      role="region"
      aria-label="Current persona"
      title={`${actor.name}, ${actor.title}`}
    >
      {CAN[actor.role]}
    </Banner>
  );
}
