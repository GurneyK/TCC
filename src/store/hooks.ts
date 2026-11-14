import { useMemo } from "react";
import { create } from "zustand";
import type { EvidenceRef } from "@/agents/types";
import type { TreasurySnapshot } from "@/data/types";
import { PERSONAS } from "@/data/world";
import { staleSourceIds } from "@/lib/freshness";
import { useTreasury } from "./useTreasury";

export function useSnapshot(): TreasurySnapshot {
  const data = useTreasury((s) => s.data);
  const now = useTreasury((s) => s.now);
  return useMemo(() => ({ ...data, now }), [data, now]);
}

export function useActor() {
  const role = useTreasury((s) => s.role);
  return { role, ...PERSONAS[role] };
}

/** Sources that have missed their SLA right now. */
export function useStaleSources() {
  const sources = useTreasury((s) => s.data.sources);
  const now = useTreasury((s) => s.now);
  return useMemo(() => staleSourceIds(sources, now), [sources, now]);
}

export function useOpenFindings() {
  const findings = useTreasury((s) => s.findings);
  return useMemo(() => findings.filter((f) => f.status === "open" || f.status === "escalated"), [findings]);
}

/** UI only state: which record drawer is open, toasts. Not persisted. */
interface UiState {
  record: EvidenceRef | null;
  openRecord: (ref: EvidenceRef | null) => void;
  toast: { id: number; title: string; body: string; tone: "success" | "error" | "info" | "warning" } | null;
  notify: (title: string, body: string, tone?: "success" | "error" | "info" | "warning") => void;
}

let toastSeq = 0;
export const useUi = create<UiState>()((set) => ({
  record: null,
  openRecord: (record) => set({ record }),
  toast: null,
  notify: (title, body, tone = "success") => set({ toast: { id: (toastSeq += 1), title, body, tone } }),
}));
