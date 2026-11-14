import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state/EmptyState";
import { PageHeading } from "@/features/shared/PageHeading";

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageHeading title="Page not found" />
      <EmptyState
        actionLabel="Back to the hub"
        description="That address doesn't match a screen in the hub."
        icon={<Compass aria-hidden="true" className="h-6 w-6" />}
        onAction={() => (window.location.hash = "#/")}
        title="Nothing here"
      />
    </div>
  );
}
