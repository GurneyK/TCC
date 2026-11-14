import type { Role } from "@/data/types";
import { PERSONAS } from "@/data/world";

export interface PersonaMeta {
  role: Role;
  name: string;
  title: string;
  initials: string;
  tone: "brand" | "info" | "success";
  /** What this person can do, in a few words. */
  can: string;
}

export const PERSONA_META: Record<Role, PersonaMeta> = {
  analyst: { role: "analyst", ...PERSONAS.analyst, initials: "PS", tone: "brand", can: "Works findings, drafts and submits payments" },
  treasurer: { role: "treasurer", ...PERSONAS.treasurer, initials: "DO", tone: "info", can: "Approves, rejects and releases payments" },
  auditor: { role: "auditor", ...PERSONAS.auditor, initials: "ML", tone: "success", can: "Read only, sees the full audit trail" },
};

export const ROLES: Role[] = ["analyst", "treasurer", "auditor"];
