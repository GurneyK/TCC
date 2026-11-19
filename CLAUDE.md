# Treasury Command Center (TCC)

Read this file first, every session. Then read `docs/BUILD_SPEC.md` for the full product and build plan, and `docs/PROGRESS.md` to see where we left off.

## What this is

A working mock of a corporate treasury hub for a global consumer goods company. Data sources from banks, ERP, FX markets and file uploads flow into one dashboard. Agents in the hub watch that data, flag problems and recommend actions. A human always approves anything that moves money.

It's a portfolio piece by Gurnoor Kahlon (Design Engineer). The goal is to show banking and finance employers strong product thinking, agent UX and bank grade patterns: maker/checker approvals, audit trails, explainable agents, data freshness and accessibility.

## Hard rules

1. **All data is synthetic.** Never use real company names, logos, real bank names, real people or real account numbers. The fictional company is **Lumen Brands Group**. Fictional banks are listed in the spec.
2. **No employer branding anywhere in the app.** No logos, no names. The README can say it's a concept inspired by the kind of tooling a global CPG treasury team uses. Nothing internal from any employer goes in this repo.
3. **Use the Design System. Don't invent UI.** See the Design System section below.
4. **Money is stored as integer minor units** (cents) with an ISO currency code. Never do math on floats for money. Format with `Intl.NumberFormat`.
5. **Agents never move money.** They create findings and recommendations. Only a human with the right role can approve, and nobody can approve their own payment.
6. **Every state change is written to the audit log** with actor (user or agent), timestamp, action, target and details.
7. **Accessibility is a requirement, not polish.** Target WCAG 2.2 AA from the first screen.
8. **Work one phase at a time** from `docs/BUILD_SPEC.md`. At the end of each phase, run the checks, update `docs/PROGRESS.md`, commit, and stop so Gurnoor can review.

## Stack

* Vite + React 18 + TypeScript (strict)
* Tailwind CSS 3 with the Design System token config
* `lucide-react` icons
* `react-router-dom` for routes
* `zustand` for app state
* Vitest for unit tests, Playwright + `@axe-core/playwright` for smoke and accessibility tests

Match the Design System's versions of React (18) and Tailwind (3). Don't upgrade either.

## Commands

```bash
npm run dev          # local dev server
npm run build        # typecheck + production build
npm run test         # vitest
npm run test:e2e     # playwright smoke + axe accessibility checks
npm run lint         # eslint
```

All of these must pass before a phase is marked done.

## Design System

The Design System lives in a separate repo: https://github.com/GurneyK/Design-library

Clone it as a sibling folder so the paths line up:

```bash
cd ..
git clone https://github.com/GurneyK/Design-library.git
cd TCC
```

Expected layout:

```
parent/
  Design-library/
  TCC/
```

Always refer to it as "the Design System" in docs, UI copy and commit messages.

### Picking components

1. The catalog is `../Design-library/manifest.json` (also live at https://gurneyk.github.io/Design-library/manifest.json). Read an entry's `useWhen`, `doNotUseWhen`, `variants`, `props`, `accessibility` and `agentGuidance` before using it.
2. Prefer templates for full screens, then components, then foundations. The spec maps each TCC screen to specific entries.
3. If nothing fits, don't invent a component. Add a gap proposal to `docs/DS_GAPS.md` (name, category, use case, props, variants, tokens, accessibility) and ask before building it.

Search the catalog from the terminal:

```bash
node ../Design-library/scripts/copy-component.mjs --search payment
node ../Design-library/scripts/copy-component.mjs --list
```

### Copying components in

**Always use the helper. Never run the Design System copy script straight into this repo.** The raw script silently overwrites files, which would wipe out any component we've already promoted.

```bash
./scripts/ds-add.sh table review-queue approval-form
./scripts/ds-add.sh --globals table   # first time only: also brings tailwind.config.ts + src/index.css
```

The helper copies files to a staging folder, then only adds files that don't exist yet. It prints `added` or `kept existing` for each file.

Copied files land at the same paths as the Design System: `src/components/ui/...` and `src/components/templates/...`. Keep those paths. Don't put TCC feature code in those folders.

### Promoting demo components

Many Design System components are demo components with hardcoded data and no props. About 80 of them today, including every chart, `KpiStrip`, `ReviewQueue`, `TracePanel`, `ApprovalForm`, `FilterBar`, `PageHeader`, `PageTabs`, `NavRail`, `AppShell`, `UserMenu`, `NotificationMenu`, `HealthSummary`, `InsightQueue`, `SlaStatusPanel`, `AgentStatusBar`, `EvidenceList`, `ChangeLog`, `Composer` and `ToastStack`.

Check before you use one. If its export takes no arguments, it's a demo component:

```bash
grep -rl "^export function [A-Za-z]*() {" src/components/ui
```

Components that already take props with defaults (like `Sidebar`, `ActivityFeed`, `InsightCard`, `StatCard`, `Table`, `Timeline`, `RunCard`, `CommandPalette`, `DataSourceCard`) can be used as is.

To use a demo component with real TCC data, **promote** it:

1. Add a typed props interface. Move the hardcoded data into a `default...` constant and use it as the default prop value, so the component still renders the same with no props.
2. Keep the markup, Tailwind classes and tokens the same. Don't restyle.
3. Keep or improve the accessibility (labels, roles, keyboard behavior). Charts need a text alternative (see spec).
4. Log it in `docs/DS_CHANGES.md`: component, file, props added, why. Gurnoor will upstream these to the Design System later.

Templates (`src/components/templates/*`) are reference compositions. Read them to see how a screen should be assembled, then build the TCC screen in `src/features/...` from the same parts wired to real data. Don't edit copied templates.

### Styling rules

* Only Design System tokens through Tailwind classes: `brand-*`, `gray-*`, `success-*`, `warning-*`, `error-*`, `info-*`, `rounded-h3lSm|Md|Lg|Xl`, `shadow-h3lXs|Sm|Md|Lg`. (The token names in code still say `h3l`. That's fine in code, just call it the Design System in writing.)
* No raw hex values, no arbitrary Tailwind values like `text-[#123456]`, no custom shadows.
* Only use variants that exist on the entry.
* Use the `focus-ring` class for custom focusable elements.
* Don't copy any logo from the Design System's `public/` folder.

## Code conventions

* Feature code goes in `src/features/<feature>/`. Shared logic in `src/lib/`. Data model and generator in `src/data/`. Agent logic in `src/agents/`. State in `src/store/`.
* Import alias `@/` maps to `src/`.
* Agents are pure functions: `(snapshot) => AgentRun`. No side effects, no randomness without the seeded RNG. This keeps them testable and the demo repeatable.
* The seeded data must be deterministic. Same seed, same data, every time.
* Name things in plain treasury language (cash position, value date, counterparty), not generic dashboard language.
* Keep components small. If a feature file passes about 250 lines, split it.

## UI copy voice

Short, direct, human. No filler. No dashes in sentences. Agent explanations read like a sharp analyst wrote them: what happened, why it matters, what to do.

## Git

* Commit at the end of each phase with a message like `Phase 2: Hub, Cash Positions and Data Sources screens`.
* Small fix commits between phases are fine.
* Never commit `.env` files or API keys.
