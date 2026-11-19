import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../button/Button";

type ResultStateTone = "success" | "warning" | "info";

export interface ResultStateProps {
  description?: string;
  title?: string;
  tone?: ResultStateTone;
  /** Replaces the default buttons. Pass null for none. */
  actions?: ReactNode;
}

const toneConfig = {
  success: { icon: CheckCircle2, iconClass: "bg-success-50 text-success-700", title: "Workspace published" },
  warning: { icon: AlertTriangle, iconClass: "bg-warning-50 text-warning-700", title: "Review required" },
  info: { icon: Info, iconClass: "bg-brand-50 text-brand-700", title: "Run queued" },
};

export function ResultState({
  actions,
  description = "The latest changes are available to the workspace and ready for team review.",
  title,
  tone = "success",
}: ResultStateProps) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <section className="rounded-h3lLg border border-gray-200 bg-white p-8 text-center shadow-h3lXs">
      <div className={["mx-auto flex h-12 w-12 items-center justify-center rounded-full", config.iconClass].join(" ")}>
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title ?? config.title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">{description}</p>
      {actions === undefined ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button">View details</Button>
          <Button type="button" variant="secondaryGray">Back to dashboard</Button>
        </div>
      ) : actions ? (
        <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>
      ) : null}
    </section>
  );
}
