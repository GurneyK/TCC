import { AlertOctagon, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import type { Finding, Severity } from "@/agents/types";
import { Badge } from "@/components/ui/badge/Badge";

const config: Record<Severity, { variant: "error" | "warning" | "info" | "neutral"; Icon: typeof Info; label: string }> = {
  critical: { variant: "error", Icon: AlertOctagon, label: "Critical" },
  high: { variant: "warning", Icon: ShieldAlert, label: "High" },
  medium: { variant: "info", Icon: AlertTriangle, label: "Medium" },
  low: { variant: "neutral", Icon: Info, label: "Low" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const c = config[severity];
  return (
    <Badge variant={c.variant}>
      <c.Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {c.label}
    </Badge>
  );
}

const statusConfig: Record<Finding["status"], { variant: "brand" | "success" | "neutral" | "warning"; label: string }> = {
  open: { variant: "brand", label: "Open" },
  accepted: { variant: "success", label: "Accepted" },
  dismissed: { variant: "neutral", label: "Dismissed" },
  escalated: { variant: "warning", label: "Escalated" },
};

export function FindingStatusBadge({ status }: { status: Finding["status"] }) {
  const c = statusConfig[status];
  return (
    <Badge dot variant={c.variant}>
      {c.label}
    </Badge>
  );
}
