# Progress

Claude Code updates this file at the end of every phase. Tick the boxes, add notes on anything skipped or changed, and list open questions for Gurnoor.

**13 Nov 2026.** Gurnoor asked for the full working demo in one pass instead of stopping after each phase. Phases 0 to 6 and the deploy part of Phase 8 were built together. Phase 7 is skipped by choice.

Checks at the end of the pass: `npm run lint` clean, `npm run build` clean, `npm run test` 34 of 34, `npm run test:e2e` 14 of 14 (axe on all 9 routes with zero serious or critical violations, plus S1, S6, S8, CSV import and the guided demo clicked end to end).

## Phase 0: Scaffold
* [x] Vite + React 18 + TS app created without touching existing docs and scripts
* [x] Design System globals brought in with `./scripts/ds-add.sh --globals`
* [x] `@/` alias, router, every route
* [x] App shell, persona banner, skip link, fictional data footer
* [x] lint, build pass

## Phase 1: Data layer
* [x] Types, seeded RNG, generator, planted scenarios, watchlist
* [x] Money utilities with tests
* [x] Store and snapshot selector (`src/store`)
* [x] Live feed simulator and demo controls (pause, reset, 1x and 4x)
* [x] Freshness monitor
* [x] Tests pass (determinism, scenarios S1 to S8, money math)
* [ ] Dev only debug panel. Skipped: the Agents screen and the store tests cover the same ground.

## Phase 2: Hub, Cash Positions, Data Sources
* [x] Promoted components logged in DS_CHANGES.md
* [x] Hub, Cash Positions, Data Sources screens
* [x] Stale data badges (S8) and Retry sync
* [x] CSV upload flow with `public/samples/crestwood-statement.csv` (15 matched, 3 fees, 2 exceptions)
* [x] Playwright + axe passing

## Phase 3: Agents and Exceptions
* [x] Reconciliation, Payment Risk, Cash Forecast, FX Exposure agents
* [x] Agent tests against S1 to S7
* [x] Exceptions and Agents screens
* [x] Finding actions (accept, dismiss with reason, escalate, verify callback), all audited
* [x] Evidence chips open the record in a drawer

## Phase 4: Payments, maker/checker, audit
* [x] Payments screen and approval rules (tested in `src/store/store.test.ts`)
* [x] Batch release and bank acknowledgement after 3 seconds
* [x] Audit Log with filters and CSV export
* [x] Role switcher fully wired. Auditor sees no action buttons.
* [x] S1 walkable end to end

## Phase 5: Forecast and FX
* [x] Forecast screen with base and stress scenarios, minimum balance line and drivers waterfall
* [x] FX Exposure screen with hedge requests that a second person books
* [x] S6 and S7 walkable end to end
* [x] Every chart has View as table
* [ ] Gauge chart. Not used: the stacked bar with a target marker says the same thing more clearly.

## Phase 6: Accessibility pass, polish and demo mode
* [x] Axe clean on every route, keyboard reachable dialogs with focus trap and return
* [x] Guided demo (6 steps, skippable, Escape closes)
* [x] Loading skeleton for route chunks, empty states on every list
* [ ] Command palette and notification menu. Not built yet. The polite live region announces new high or critical findings instead.
* [ ] Full manual screen reader walkthrough and Lighthouse run. Still to do by hand.

## Phase 7 (optional): Ask Treasury
* [ ] Skipped by choice for the first release.

## Phase 8: Ship it
* [x] GitHub Pages workflow
* [x] README case study
* [ ] Demo recording

## Redesign pass (13 Nov 2026)

- [x] Concept footer and persona banner removed. App reads as a real product: logo lockup, breadcrumb top bar, live feed status, alerts bell.
- [x] User switcher in the bottom left of the sidebar with a hint. Feed speed, guided tour and reset live in its menu.
- [x] Tour invitation banner at the top, dismissible. Tour card moved bottom right.
- [x] Hub has three views: Overview, Liquidity, Risk and controls (`?view=`).
- [x] Exceptions list is a sticky pane that scrolls on its own beside the detail. Agent filter chips.
- [x] More color (agent tones, tinted KPI icons) and motion that respects reduced motion.
- [x] Promotions logged in DS_CHANGES.md. Screenshots retaken.

## Notes and open questions
* The Design System focus ring alone was too faint on white, so `.focus-ring` now adds an outline. Worth upstreaming.
* Escalating a finding unblocks approval, as the spec says. A real bank would probably keep critical findings blocking until compliance clears them. Worth a decision.
* Release posts acknowledged payments to bank balances, so the hub total moves when Daniel releases a batch.
