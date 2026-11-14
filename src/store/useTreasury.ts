import { create } from "zustand";
import { AGENT_META, type AgentId } from "@/agents/types";
import { generateData } from "@/data/generator";
import type { TreasuryData } from "@/data/types";
import { DEFAULT_SEED, DEMO_START } from "@/data/world";
import { addMinutes } from "@/lib/dates";
import { staleSourceIds } from "@/lib/freshness";
import { LIVE_CADENCE, LIVE_SEED_OFFSET, makeLiveTransactions, nudgeRates, touchSources } from "@/simulator/liveFeed";
import { commit } from "./commit";
import { ALL_AGENTS, composeFindings, initialAudit, runAgents, userActor, withIds } from "./engine";
import { findingActions } from "./findingActions";
import { paymentActions, postToBalances } from "./paymentActions";
import { clearOverlay, loadOverlay, saveOverlay, type SavedOverlay } from "./persist";
import type { CoreState, TreasuryState } from "./state";

const REF_PATTERN = /\b(?:AR|INV)-\d+[A-Z]?\b/g;

/** The generated world for the current seed. Saved overlays are diffs against it. */
let base: TreasuryData = generateData(DEFAULT_SEED, DEMO_START);

function applyOverlay(data: TreasuryData, o: SavedOverlay): TreasuryData {
  const transactions = [...data.transactions, ...o.addedTransactions].map((t) => (o.txStatus[t.id] ? { ...t, ...o.txStatus[t.id] } : t));
  let next: TreasuryData = {
    ...data,
    payments: o.payments,
    hedges: o.hedges,
    sources: o.sources,
    rates: o.rates,
    transactions,
    invoices: data.invoices.map((i) => (o.invoiceStatus[i.id] ? { ...i, status: o.invoiceStatus[i.id] } : i)),
    accounts: data.accounts.map((a) => (o.balances[a.id] ? { ...a, ...o.balances[a.id] } : a)),
  };
  // A refresh mid release: the bank acknowledgement already happened in the real world.
  for (const p of next.payments.filter((x) => x.status === "released")) next = postToBalances(next, p);
  next = { ...next, payments: next.payments.map((p) => (p.status === "released" ? { ...p, status: "acknowledged" } : p)) };
  return next;
}

export function buildState(seed: number, overlay: SavedOverlay | null): CoreState {
  base = generateData(seed, DEMO_START);
  const data = overlay ? applyOverlay(base, overlay) : base;
  const now = overlay?.now ?? DEMO_START;
  const scopedTxIds = overlay?.scopedTxIds ?? {};
  const runs = runAgents(ALL_AGENTS, data, now, scopedTxIds);
  const resolved = overlay?.resolved ?? {};
  const findings = composeFindings(runs, resolved);
  const fresh = overlay ? null : withIds(initialAudit(data, runs, now), 0);
  return {
    seed,
    now,
    role: overlay?.role ?? "analyst",
    data,
    hedgeRequests: overlay?.hedgeRequests ?? [],
    runs,
    scopedTxIds,
    resolved,
    findings,
    audit: overlay?.audit ?? fresh?.events ?? [],
    seq: overlay?.seq ?? fresh?.seq ?? 0,
    seenFindingIds: overlay?.seenFindingIds ?? findings.map((f) => f.id),
    sim: {
      paused: overlay?.paused ?? false,
      speed: overlay?.speed ?? 1,
      simSeconds: overlay?.simSeconds ?? 0,
      rngState: overlay?.rngState ?? (seed ^ LIVE_SEED_OFFSET) >>> 0,
      liveSeq: overlay?.liveSeq ?? 1,
    },
    importCount: overlay?.importCount ?? 0,
    dismissedTour: overlay?.dismissedTour ?? false,
    announcement: null,
    running: [],
  };
}

export function toOverlay(s: CoreState): SavedOverlay {
  const baseTx = new Map(base.transactions.map((t) => [t.id, t]));
  const baseInv = new Map(base.invoices.map((i) => [i.id, i]));
  const baseAcc = new Map(base.accounts.map((a) => [a.id, a]));
  const txStatus: SavedOverlay["txStatus"] = {};
  const addedTransactions = [];
  for (const t of s.data.transactions) {
    const b = baseTx.get(t.id);
    if (!b) addedTransactions.push({ ...t, status: "unmatched" as const, matchedInvoiceIds: undefined });
    if (!b || b.status !== t.status) txStatus[t.id] = { status: t.status, matchedInvoiceIds: t.matchedInvoiceIds };
  }
  const invoiceStatus: SavedOverlay["invoiceStatus"] = {};
  for (const i of s.data.invoices) if (baseInv.get(i.id)?.status !== i.status) invoiceStatus[i.id] = i.status;
  const balances: SavedOverlay["balances"] = {};
  for (const a of s.data.accounts) {
    const b = baseAcc.get(a.id);
    if (b && (b.balance.minor !== a.balance.minor || b.availableBalance.minor !== a.availableBalance.minor)) balances[a.id] = { balance: a.balance, availableBalance: a.availableBalance };
  }
  return {
    version: 1,
    seed: s.seed,
    now: s.now,
    role: s.role,
    simSeconds: s.sim.simSeconds,
    rngState: s.sim.rngState,
    liveSeq: s.sim.liveSeq,
    speed: s.sim.speed,
    paused: s.sim.paused,
    payments: s.data.payments,
    hedges: s.data.hedges,
    hedgeRequests: s.hedgeRequests,
    sources: s.data.sources,
    rates: s.data.rates,
    txStatus,
    invoiceStatus,
    balances,
    addedTransactions,
    scopedTxIds: s.scopedTxIds,
    resolved: s.resolved,
    audit: s.audit,
    seq: s.seq,
    seenFindingIds: s.seenFindingIds,
    importCount: s.importCount,
    dismissedTour: s.dismissedTour,
  };
}

const crossed = (prev: number, next: number, every: number) => Math.floor(prev / every) < Math.floor(next / every);

function loadInitial(): CoreState {
  const overlay = typeof window === "undefined" ? null : loadOverlay();
  try {
    return buildState(overlay?.seed ?? DEFAULT_SEED, overlay);
  } catch {
    // A saved state from an older build. Start clean.
    clearOverlay();
    return buildState(DEFAULT_SEED, null);
  }
}

export const useTreasury = create<TreasuryState>()((set, get) => ({
  ...loadInitial(),
  ...findingActions(set, get),
  ...paymentActions(set, get),

  reset() {
    clearOverlay();
    set({ ...buildState(DEFAULT_SEED, null) });
  },

  setRole(role) {
    set({ role });
  },

  setPaused(paused) {
    set((s) => ({ sim: { ...s.sim, paused } }));
  },

  setSpeed(speed) {
    set((s) => ({ sim: { ...s.sim, speed } }));
  },

  dismissTour(value) {
    set({ dismissedTour: value });
  },

  runNow(agent: AgentId) {
    const s = get();
    if (s.running.includes(agent)) return;
    set({ running: [...s.running, agent] });
    setTimeout(() => {
      const cur = get();
      set({ running: cur.running.filter((a) => a !== agent) });
      commit(get, set, {
        rerun: [agent],
        events: [
          { at: cur.now, actor: userActor(cur.role), action: "Started agent run", target: { type: "agent", id: agent, label: AGENT_META[agent].name } },
        ],
      });
      const after = get();
      const findings = Object.values(after.runs).filter((r) => r.agentId === agent).reduce((n, r) => n + r.findings.length, 0);
      commit(get, set, {
        events: [{ at: after.now, actor: { type: "agent", agentId: agent }, action: "Completed run", target: { type: "agent", id: agent, label: AGENT_META[agent].name }, details: { findings } }],
      });
    }, 900);
  },

  /** One real second of the live feed. */
  tick() {
    const s = get();
    if (s.sim.paused) return;
    const prev = s.sim.simSeconds;
    const next = prev + s.sim.speed;
    const now = addMinutes(s.now, s.sim.speed / 60);
    let data = s.data;
    let rngState = s.sim.rngState;
    let liveSeq = s.sim.liveSeq;
    let scopedTxIds = s.scopedTxIds;

    if (crossed(prev, next, LIVE_CADENCE.transactions)) {
      const frozen = staleSourceIds(data.sources, now);
      const claimed = new Set<string>(Object.values(s.runs).flatMap((r) => (r.suggestions ?? []).flatMap((m) => m.invoiceIds)));
      const liveIds = new Set(scopedTxIds.live ?? []);
      const numbers = new Set(data.transactions.filter((t) => liveIds.has(t.id) && t.status === "unmatched").flatMap((t) => t.reference.match(REF_PATTERN) ?? []));
      data.invoices.forEach((i) => numbers.has(i.number) && claimed.add(i.id));
      const result = makeLiveTransactions(data, rngState, now, liveSeq, { frozenSourceIds: frozen, claimedInvoiceIds: claimed });
      rngState = result.rngState;
      liveSeq += result.transactions.length;
      const byAccount = new Map<string, number>();
      result.transactions.forEach((t) => byAccount.set(t.accountId, (byAccount.get(t.accountId) ?? 0) + (t.direction === "in" ? t.amount.minor : -t.amount.minor)));
      const linesBySource = new Map<string, number>();
      const accounts = data.accounts.map((a) => {
        const delta = byAccount.get(a.id);
        if (delta === undefined) return a;
        linesBySource.set(a.sourceId, (linesBySource.get(a.sourceId) ?? 0) + 1);
        return { ...a, balance: { ...a.balance, minor: a.balance.minor + delta }, availableBalance: { ...a.availableBalance, minor: a.availableBalance.minor + delta } };
      });
      data = { ...data, accounts, transactions: [...data.transactions, ...result.transactions], sources: touchSources(data.sources, now, frozen, linesBySource) };
      const stillOpen = (scopedTxIds.live ?? []).filter((id) => data.transactions.find((t) => t.id === id)?.status === "unmatched");
      scopedTxIds = { ...scopedTxIds, live: [...stillOpen, ...result.transactions.map((t) => t.id)] };
    }

    if (crossed(prev, next, LIVE_CADENCE.rates)) {
      const r = nudgeRates(data.rates, rngState, now);
      rngState = r.rngState;
      data = { ...data, rates: r.rates };
    }

    set({ now, sim: { ...s.sim, simSeconds: next, rngState, liveSeq } });

    if (crossed(prev, next, LIVE_CADENCE.reconciliation)) {
      const before = s.runs["recon:live"]?.suggestions?.length ?? 0;
      commit(get, set, { data, scopedTxIds, rerun: ["reconciliation"] });
      const after = get().runs["recon:live"]?.suggestions?.length ?? 0;
      if (after > before) {
        commit(get, set, {
          events: [{ at: now, actor: { type: "agent", agentId: "reconciliation" }, action: "Matched live bank lines", target: { type: "agent", id: "reconciliation", label: AGENT_META.reconciliation.name }, details: { suggested: after, newLines: after - before } }],
        });
      }
    } else {
      set({ data, scopedTxIds });
    }
  },
}));

// Save a small overlay of user changes, at most once a second.
if (typeof window !== "undefined") {
  let timer: ReturnType<typeof setTimeout> | undefined;
  useTreasury.subscribe(() => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      saveOverlay(toOverlay(useTreasury.getState()));
    }, 1000);
  });
}
