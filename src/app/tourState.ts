import { create } from "zustand";
import type { Role } from "@/data/types";
import { SCENARIOS } from "@/data/scenarios";

export interface TourStep {
  title: string;
  body: string;
  path: string;
  target: string;
  role?: Role;
  roleLabel?: string;
}

const S1 = `pr-${SCENARIOS.S1.paymentId}`;

export const TOUR: TourStep[] = [
  {
    title: "Hub",
    body: "This is Lumen's cash across 12 entities and 5 banks. One feed, Crestwood Trust, is 26 hours stale, so every number built on it is flagged. You always know whether to trust a number.",
    path: "/",
    target: "total-cash",
  },
  {
    title: "Exceptions",
    body: "Overnight the agents raised these findings, ranked by risk. The top one: Orchard Packaging changed its bank details two days ago and a 1.84M payment is waiting. That's the classic invoice fraud pattern. Open the evidence and the trace.",
    path: `/exceptions?f=${S1}`,
    target: "finding-detail",
  },
  {
    title: "Maker and checker",
    body: "As Priya, record the callback as not confirmed. The payment rejects itself. Then switch to Daniel: the approve button was never available for it, and the reason is right there.",
    path: `/exceptions?f=${S1}`,
    target: "finding-actions",
    role: "treasurer",
    roleLabel: "Switch to Daniel",
  },
  {
    title: "Reconciliation",
    body: "Brightmart short paid by 4.6%. The agent didn't just fail the match. It proposed a partial match and a deduction case for the gap.",
    path: `/exceptions?f=rc-short-${SCENARIOS.S4.transactionId}`,
    target: "finding-detail",
    role: "analyst",
    roleLabel: "Switch to Priya",
  },
  {
    title: "Forecast",
    body: "Brazil drops under its minimum in week 6. The agent suggests funding it from the Treasury Centre with an exact amount. Accept it and it becomes a draft payment for Daniel to approve.",
    path: `/forecast?entity=${SCENARIOS.S6.entityId}`,
    target: "funding",
  },
  {
    title: "Audit",
    body: "As Mei, filter today's log. Every agent finding and every human decision: who, when and why.",
    path: "/audit",
    target: "audit-filters",
    role: "auditor",
    roleLabel: "Switch to Mei",
  },
];

interface TourState {
  step: number | null;
  start: () => void;
  go: (step: number) => void;
  stop: () => void;
}

export const useTour = create<TourState>()((set) => ({
  step: null,
  start: () => set({ step: 0 }),
  go: (step) => set({ step }),
  stop: () => set({ step: null }),
}));
