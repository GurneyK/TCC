# Treasury Command Center: Build Spec

This is the full plan for building TCC with Claude Code. `CLAUDE.md` has the rules. This file has the product, the data, the agents, the screens and the phases.

## 1. The product

### The story

Lumen Brands Group is a fictional global consumer goods company. Think household and personal care brands sold in 60 countries. Its treasury team manages cash across 12 legal entities, 5 banks and 10 currencies.

Today that work is spread across bank portals, ERP exports and spreadsheets. Analysts spend the morning pulling balances, matching transactions by hand and chasing exceptions. Risky payments slip through because nobody notices a supplier changed its bank details two days ago.

TCC puts all of it in one hub. Data sources sync in. Four agents watch the data and raise findings with evidence. Humans review, approve and act. Everything is logged.

### Why banks care

Corporate treasury teams are the core customers of commercial banking. A bank's cash management product, payments platform and client portal all exist to serve this exact team. Building TCC shows you understand the client's daily work, not just the bank's screens.

### Who uses it

| Persona | Role in app | Can do |
|---|---|---|
| Priya Shah, Treasury Analyst | `analyst` (maker) | View everything, create and submit payments, act on findings, upload files |
| Daniel Okafor, Group Treasurer | `treasurer` (checker) | Everything an analyst can, plus approve or reject payments. Can't approve a payment he created |
| Mei Lin, Internal Auditor | `auditor` | Read only. Full audit log access and export |

There's no real login. A role switcher in the user menu lets you swap personas for demos. Show a clear banner with the current persona at all times.

### Jobs to be done

1. "Tell me where our cash is right now and whether I can trust the number."
2. "Show me what needs my attention today, ranked."
3. "Stop me from sending money to the wrong place."
4. "Warn me before an entity runs short of cash."
5. "Tell me if our currency risk is outside policy."
6. "Prove to an auditor who did what and why."

## 2. Fictional world

Use these names. Never use real company or bank names.

**Company:** Lumen Brands Group. Reporting currency USD.

**Legal entities (12):**

| Entity | Country | Currency | Min balance policy |
|---|---|---|---|
| Lumen Brands Inc. | United States | USD | 25,000,000 |
| Lumen Brands Canada Ltd. | Canada | CAD | 8,000,000 |
| Lumen Brands Mexico S.A. | Mexico | MXN | 90,000,000 |
| Lumen Brands Brasil Ltda. | Brazil | BRL | 30,000,000 |
| Lumen Brands UK Ltd. | United Kingdom | GBP | 6,000,000 |
| Lumen Brands Europe B.V. | Netherlands | EUR | 15,000,000 |
| Lumen Brands Deutschland GmbH | Germany | EUR | 7,000,000 |
| Lumen Brands South Africa (Pty) | South Africa | ZAR | 60,000,000 |
| Lumen Brands India Pvt. Ltd. | India | INR | 400,000,000 |
| Lumen Brands Singapore Pte. | Singapore | SGD | 5,000,000 |
| Lumen Brands China Co. | China | CNY | 35,000,000 |
| Lumen Treasury Centre B.V. | Netherlands | EUR | 50,000,000 (concentration entity) |

**Banks (5):** Harborline Bank, Northgate Commercial, Crestwood Trust, Pacific Meridian Bank, Alder & Stone.

**Retail customers (examples):** Brightmart, Freshway Grocers, Northstar Pharmacy, Kiosko Plus, Urban Basket, Maple Market, Tesvia, Shopwell Online.

**Suppliers (examples):** Orchard Packaging Co., Bluewave Logistics, Halden Chemicals, Sunreach Palm Oils, Verde Agro Supplies, Corrugate Partners, Ionix Fragrances, Kestral Holding Limited.

**Fictional watchlist:** a small JSON list of sanctioned names. Include `Kestrel Holdings Ltd` so the supplier `Kestral Holding Limited` triggers a near match.

**Account numbers:** always masked, like `•••• 4417`. Generate the last four digits from the seeded RNG. Never generate a full account number or IBAN.

## 3. Data model

Put these in `src/data/types.ts`.

```ts
type CurrencyCode = "USD" | "CAD" | "MXN" | "BRL" | "GBP" | "EUR" | "ZAR" | "INR" | "SGD" | "CNY";

type Money = { minor: number; currency: CurrencyCode }; // minor units, integers only

type Role = "analyst" | "treasurer" | "auditor";

interface Entity { id: string; name: string; country: string; currency: CurrencyCode; minBalance: Money; region: "NA" | "LATAM" | "EMEA" | "APAC" }

interface Bank { id: string; name: string }

interface BankAccount {
  id: string; bankId: string; entityId: string; currency: CurrencyCode;
  type: "operating" | "collections" | "payroll" | "concentration";
  maskedNumber: string; balance: Money; availableBalance: Money;
  sourceId: string; // which data source feeds it
}

interface Transaction {
  id: string; accountId: string; valueDate: string; bookedAt: string;
  amount: Money; direction: "in" | "out";
  counterparty: string; reference: string;
  status: "unmatched" | "matched" | "suggested" | "exception";
  matchedInvoiceIds?: string[];
}

interface Invoice {
  id: string; number: string; kind: "AR" | "AP"; entityId: string;
  counterpartyId: string; amount: Money; issueDate: string; dueDate: string;
  status: "open" | "partially_paid" | "paid" | "disputed";
}

interface Counterparty {
  id: string; name: string; kind: "customer" | "supplier"; country: string;
  maskedBankAccount?: string; bankDetailsChangedAt?: string;
  avgDaysLate?: number; // customers only, used by the forecast
}

interface Payment {
  id: string; entityId: string; fromAccountId: string; counterpartyId: string;
  invoiceIds: string[]; amount: Money; valueDate: string;
  kind: "supplier" | "intercompany" | "fx_settlement";
  status: "draft" | "pending_approval" | "approved" | "rejected" | "released" | "acknowledged";
  createdBy: string; approvedBy?: string; rejectedReason?: string;
  linkedFindingIds: string[];
}

interface FxRate { pair: `${CurrencyCode}/USD`; rate: number; updatedAt: string } // rate is a decimal, money stays in minor units

interface Hedge { id: string; currency: CurrencyCode; notional: Money; rate: number; tradeDate: string; maturityDate: string; bankId: string }

interface DataSource {
  id: string; name: string;
  type: "bank_feed" | "erp" | "market_data" | "watchlist" | "file_upload";
  format: string; // e.g. "camt.053", "MT940", "SAP extract", "CSV"
  status: "healthy" | "delayed" | "failed" | "paused";
  lastSyncAt: string; slaMinutes: number; recordsToday: number;
}

interface AuditEvent {
  id: string; at: string;
  actor: { type: "user"; name: string; role: Role } | { type: "agent"; agentId: AgentId } | { type: "system" };
  action: string; // e.g. "payment.approved", "finding.dismissed", "source.synced"
  target: { type: string; id: string; label: string };
  details?: Record<string, string | number | boolean>;
}
```

Agent types go in `src/agents/types.ts`:

```ts
type AgentId = "reconciliation" | "payment_risk" | "cash_forecast" | "fx_exposure";

type Severity = "low" | "medium" | "high" | "critical";

interface EvidenceRef { type: "transaction" | "invoice" | "payment" | "counterparty" | "source" | "fx" | "hedge" | "watchlist"; id: string; label: string }

interface Finding {
  id: string; agentId: AgentId; severity: Severity;
  title: string;          // "Bank details changed 2 days before a 1.84M payment"
  summary: string;        // one or two plain sentences
  reasons: string[];      // each rule that fired, in plain language
  evidence: EvidenceRef[];
  confidence: number;     // 0 to 1
  recommendation: { action: "hold_payment" | "verify_callback" | "confirm_match" | "open_deduction_case" | "fund_entity" | "book_hedge" | "review"; label: string; amount?: Money };
  status: "open" | "accepted" | "dismissed" | "escalated";
  resolution?: { by: string; at: string; note: string };
  createdAt: string;
}

interface TraceStep { label: string; detail: string; durationMs: number; status: "done" | "warning" | "skipped" }

interface AgentRun { id: string; agentId: AgentId; startedAt: string; finishedAt: string; inputs: string; steps: TraceStep[]; findings: Finding[] }
```

### Seed data

Build a seeded generator in `src/data/`. Use a small seeded PRNG (mulberry32 is fine) in `src/data/rng.ts`. No unseeded `Math.random` anywhere in data or agents.

Target sizes:

* 12 entities, 5 banks, about 30 bank accounts
* 8 data sources: one feed per bank, ERP, FX market data, watchlist
* 40 customers, 180 suppliers
* About 2,500 transactions over the last 90 days
* About 1,200 invoices
* About 60 payments in various statuses, 15 to 20 pending approval
* 2 to 4 hedges per non USD currency
* Total cash should land around USD 4 to 5 billion equivalent so the numbers feel real for a company this size

### Planted scenarios

These are the moments the demo is built around. Plant them on purpose in `src/data/scenarios.ts` so they always exist, no matter the seed. Write a test that asserts each one is present and that the right agent catches it.

| # | Scenario | Caught by | Expected finding |
|---|---|---|---|
| S1 | Orchard Packaging Co. changed bank details 2 days ago. A USD 1,840,000 payment to them is pending approval | Payment Risk | Critical. Hold payment, verify by callback |
| S2 | Two payments to Bluewave Logistics for the same amount within 5 days, invoice numbers `INV-20431` and `INV-20431A` | Payment Risk | High. Likely duplicate |
| S3 | Supplier Kestral Holding Limited is a near match to watchlist entry Kestrel Holdings Ltd | Payment Risk | Critical. Block pending compliance review |
| S4 | Brightmart paid 4.6% less than invoice `AR-88120` | Reconciliation | Medium. Partial match, open deduction case |
| S5 | 14 small bank fee debits with `FEE` in the reference | Reconciliation | Low. Suggested matches, batch confirm |
| S6 | Lumen Brands Brasil drops below its minimum balance in week 6 of the forecast | Cash Forecast | High. Fund entity with a specific BRL amount from the Treasury Centre |
| S7 | EUR exposure is only 48% hedged against a 60% to 80% policy band | FX Exposure | Medium. Book a forward for a specific EUR notional |
| S8 | The Crestwood Trust feed is 26 hours stale | Freshness monitor | Delayed source. Every balance from that bank shows a stale warning |

### Live feed simulator

`src/simulator/liveFeed.ts`:

* Every 4 seconds push 1 to 3 new transactions to random accounts. Most should be easy matches so reconciliation has steady work.
* Every 15 seconds nudge FX rates by up to 0.1%.
* Every 30 seconds rerun the Reconciliation agent on new transactions only.
* Update each source's `lastSyncAt` except Crestwood Trust (S8), until the user clicks "Retry sync" on it.
* Demo controls in the top bar: **Pause live feed**, **Reset demo** (reseeds and clears state), **Speed** (1x, 4x).
* The simulator uses the seeded RNG too, so a reset replays the same sequence.
* If the user prefers reduced motion, don't animate number changes.

### State and persistence

* One zustand store in `src/store/`. Slices for data, agents, payments, audit and ui.
* Persist user actions (approvals, finding resolutions, uploads, role) to `localStorage` so a refresh doesn't wipe a demo in progress. Wrap every read and write in try/catch and fall back to memory. "Reset demo" clears it.

## 4. The agents

Every agent lives in `src/agents/<agentId>.ts` and is a pure function:

```ts
type Agent = (snapshot: TreasurySnapshot, now: Date) => AgentRun;
```

Each run returns trace steps (so the UI can show the agent's work) and findings. Findings must be explainable: every `reason` is a sentence a treasurer would understand, and every claim points to evidence.

### Reconciliation Agent

Matches bank transactions to open invoices.

Rules in order:

1. **Exact match.** Amount and currency equal, and the reference contains the invoice number. Confidence 0.98. Status `suggested`.
2. **Strong match.** Counterparty matches, amount within 0.5%, value date within 5 days of due date. Confidence 0.85.
3. **Short pay.** Customer matches, amount is 1% to 8% under the invoice. Confidence 0.75. Recommend partial match plus a deduction case (S4).
4. **Bank fees.** Small debits with `FEE` or `CHG` in the reference. Confidence 0.9. Group into one finding with batch confirm (S5).
5. Anything left after 3 days becomes an `exception` finding.

Trace steps example: "Loaded 214 unmatched transactions", "Exact reference matches: 171", "Amount and counterparty matches: 26", "Short pays detected: 3", "Left as exceptions: 14".

### Payment Risk Agent

Checks every payment in `pending_approval`. Produces a 0 to 100 risk score and findings.

| Check | Rule | Severity |
|---|---|---|
| Bank detail change | Counterparty bank details changed in the last 30 days | Critical if under 7 days, else high |
| Duplicate | Same counterparty and amount within 14 days, or near identical invoice numbers | High |
| Watchlist | Normalized name similarity of 0.85 or more against the watchlist (Levenshtein or Jaro Winkler) | Critical |
| Unusual amount | More than 3x the counterparty's 6 month median payment | Medium |
| New geography | Paying a counterparty from an entity or country it's never been paid from before | Medium |

A payment with an open high or critical finding can't be approved. The approve button is disabled with a visible reason. The finding must be resolved first: verified by callback, dismissed with a written reason, or escalated.

### Cash Forecast Agent

Builds a 13 week forecast per entity in local currency, plus a group total in USD.

* Opening balance from current bank balances.
* Plus expected AR receipts: due date shifted by each customer's `avgDaysLate`.
* Minus scheduled AP, payroll (every 2 weeks), tax dates and hedge settlements.
* Scenarios: **Base** and **Stress** (receipts arrive 10 days later and come in 15% lower).
* Flag any week where an entity goes under its minimum balance. Recommend an intercompany funding payment from Lumen Treasury Centre with an exact amount that restores the minimum plus a 10% buffer (S6).
* Return drivers for a waterfall: opening, receipts, supplier payments, payroll, tax, FX settlements, closing.

### FX Exposure Agent

* Net exposure per non USD currency over the next 3 months: AR minus AP in that currency.
* Hedge ratio: hedges maturing in the window divided by net exposure.
* Policy band: 60% to 80%. Flag below 60% (recommend a forward notional that reaches 70%) and above 100% (over hedged).
* Show the indicative cost using the current rate plus a fixed spread. Label it "indicative" in the UI.

### Freshness monitor

Not an agent, a system check. A source is `delayed` when `now - lastSyncAt > slaMinutes`. Any number built from a delayed source carries a "Stale" badge and a tooltip with the last sync time. The hub's total cash shows "Includes stale data from 1 source" when that's true.

### Acting on findings

Every action on a finding writes an audit event and updates the finding:

* **Accept** runs the recommendation. Examples: confirm the match, create a draft funding payment prefilled from the recommendation, create a draft hedge request.
* **Dismiss** requires a written reason.
* **Escalate** assigns it to the treasurer and adds it to their queue.
* **Verify callback** (S1 only) records the result of a phone verification: confirmed or not confirmed. Not confirmed rejects the payment automatically.

## 5. Screens

Routes and the Design System entries to build each one from. Use `./scripts/ds-add.sh <id>` to bring entries in. Items marked **promote** are the main demo components that need props. Others in this table may need it too, so run the check in CLAUDE.md after copying (for example `filter-bar`, `page-header`, `page-tabs`, `user-menu`, `notification-menu`, `health-summary`, `insight-queue`, `sla-status-panel`, `agent-status-bar`, `composer` and `toast-stack` are all demo components today).

| Route | Screen | What it shows | Design System entries |
|---|---|---|---|
| `/` | Hub | KPI strip (total cash USD, available liquidity, unhedged FX exposure, open findings), cash by region, 13 week group forecast, top agent findings, source health, activity feed | Reference `template-dashboard-overview`. Use `dashboard-header`, `kpi-strip` (promote), `stat-card`, `summary-chart-card`, `stacked-bar-chart` (promote), `area-chart` (promote), `insight-card`, `insight-queue`, `health-summary`, `activity-feed`, `banner` |
| `/cash` | Cash Positions | Every account with balance, available, currency, USD equivalent, bank, entity, freshness. Group by entity, bank or currency | `page-header`, `data-toolbar`, `filter-bar`, `segmented-control`, `table`, `badge`, `status-dot`, `timestamp`, `tooltip`, `drawer` for account detail, `sparkline` (promote) |
| `/forecast` | Cash Forecast | 13 week chart per entity or group, base vs stress, drivers waterfall, minimum balance line, funding recommendations | `tabs`, `segmented-control`, `select`, `line-chart` (promote), `waterfall-chart` (promote), `callout`, `insight-card` |
| `/fx` | FX Exposure | Exposure vs hedged by currency, policy band, hedge list, recommendations | `stacked-bar-chart` (promote), `gauge-chart` (promote), `table`, `key-value-grid`, `callout` |
| `/payments` | Payments | Queue by status, risk score, payment detail drawer, maker/checker approval, batch release | `page-tabs`, `table`, `run-status-pill`, `badge`, `drawer`, `approval-form` (promote), `confirmation-panel`, `popconfirm`, `timeline`, `form-section`, `toast-stack` |
| `/exceptions` | Exceptions | Every open finding from every agent, ranked by severity then amount. Finding detail with reasons, evidence, confidence, trace and actions | Reference `template-citation-review-block`. Use `review-queue` (promote), `evidence-list` (promote), `trace-panel` (promote), `citation-chip`, `tool-call-card`, `progress` for confidence, `textarea`, `modal` |
| `/agents` | Agents | One card per agent: status, last run, findings by severity, run now, latest trace, rules it uses | Reference `template-agent-ops-console`. Use `run-card`, `agent-status-bar`, `agent-avatar`, `trace-panel`, `evaluation-scorecard` |
| `/sources` | Data Sources | Each source with type, format, status, last sync, SLA, records today. Retry sync. Upload a CSV bank statement | Reference `template-source-management-workspace`. Use `data-source-card`, `sla-status-panel`, `file-upload`, `result-state`, `alert` |
| `/audit` | Audit Log | Every event, filter by actor, action, target and date. Export CSV | `table`, `filter-bar`, `date-range-picker`, `change-log` (promote), `button` |
| `/ask` | Ask Treasury (Phase 7) | Chat that answers questions about the data and cites records | Reference `template-analytics-agent-workspace`. Use `chat-surface`, `chat-message`, `composer`, `suggestion-chips`, `citation-chip`, `thinking-state`, `streaming-state` |

**Shell:** `app-shell`, `nav-rail` or `sidebar` (promote so routes and the active item come from props, with `aria-current="page"`), `topbar`, `user-menu` (role switcher), `notification-menu` (new critical findings), `command-palette` (jump to any screen, payment or finding), `banner` for the persona and demo mode.

**Empty, loading and error states:** use `empty-state`, `skeleton` and `result-state` everywhere a list can be empty or a source can fail.

### CSV upload

Put a sample file at `public/samples/crestwood-statement.csv` with about 20 rows: 15 that match open invoices, 3 fees and 2 that won't match. Columns: `value_date,amount,currency,direction,counterparty,reference,account_last4`.

Upload flow: validate columns, show a preview table with row level errors, confirm, import as transactions, run Reconciliation, show a result summary ("17 matched, 3 suggested, 2 exceptions"). Parse on the client. No server.

## 6. Accessibility (WCAG 2.2 AA)

Follow `../Design-library/docs/ACCESSIBILITY-CHECKLIST.md`, plus:

* Skip link to main content. Landmarks: banner, navigation, main.
* Every route sets a unique page title and moves focus to the page heading on navigation.
* Full keyboard support. Drawers and modals trap focus and return it on close.
* Tables have captions and proper header cells. Sortable columns use `aria-sort`.
* **Charts:** each has `role="img"` with an `aria-label` that states the takeaway (not just "Line chart"), plus a "View as table" toggle that shows the same data in a real table.
* Never rely on color alone. Severity and status always have a text label or icon too.
* Live updates: the feed must not announce every transaction. Use one polite live region that announces only new high or critical findings, at most once every 10 seconds.
* Respect `prefers-reduced-motion`.
* Money is read correctly by screen readers: render the formatted value as text, not split spans.
* Run the Design System contrast rules. Text on `gray-*` backgrounds should use `gray-600` or darker for body text.
* Playwright + axe runs on every route with zero serious or critical violations.

## 7. Phases

Do one phase at a time. At the end of each: run `npm run lint`, `npm run build`, `npm run test` (and `npm run test:e2e` from Phase 2 on), update `docs/PROGRESS.md`, commit, and stop for review.

### Phase 0: Scaffold

1. Create a Vite React TypeScript app in this repo root (don't overwrite `CLAUDE.md`, `docs/`, `scripts/` or `README.md`).
2. Install: `react@18 react-dom@18 lucide-react react-router-dom zustand`, dev: `tailwindcss@3 postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test @axe-core/playwright eslint`.
3. Check the Design System is cloned at `../Design-library`. If not, tell Gurnoor the clone command and stop.
4. Delete Vite's default `src/index.css` and `tailwind.config.*` if present, then run `./scripts/ds-add.sh --globals button` to bring in the Design System token config and base styles.
5. Make sure `tailwind.config.ts` `content` covers `./index.html` and `./src/**/*.{ts,tsx}`. Add the Inter font.
6. Set up the `@/` alias in `vite.config.ts` and `tsconfig.json`.
7. Router with every route from section 5 as a placeholder page. Use a hash router so GitHub Pages refreshes work.
8. App shell with nav, top bar, persona banner and skip link.
9. Add a footer line: "Concept project. All companies, banks, people and data are fictional."

**Done when:** the shell renders, every route is reachable by keyboard, the build passes, and no raw hex values exist outside the copied Design System files.

### Phase 1: Data layer

1. `src/data/types.ts`, `rng.ts`, `generator.ts`, `scenarios.ts`, `watchlist.json`.
2. `src/lib/money.ts`: add, subtract, convert to USD with current rates, format. All integer math. Unit test it.
3. Store slices. `TreasurySnapshot` selector that agents consume.
4. Live feed simulator and demo controls.
5. Freshness monitor.
6. Tests: same seed gives identical data, all 8 planted scenarios exist, money math never produces fractional minor units.

**Done when:** a debug panel (dev only) shows counts for every collection, the feed ticks, pause and reset work, and tests pass.

### Phase 2: Hub, Cash Positions, Data Sources

1. Promote `kpi-strip`, `stacked-bar-chart`, `area-chart`, `sparkline`, `nav-rail` as needed. Log each in `docs/DS_CHANGES.md`.
2. Build `/`, `/cash` and `/sources` with real store data.
3. Stale data badges driven by the freshness monitor (S8). "Retry sync" on Crestwood fixes it.
4. CSV upload flow with the sample file.
5. Playwright smoke + axe test for these routes.

**Done when:** total cash matches the sum of accounts in USD, S8 shows up everywhere it should, the CSV upload imports rows, and axe passes.

### Phase 3: Agents and Exceptions

1. Implement all four agents as pure functions with trace steps.
2. Unit test each agent against the planted scenarios (S1 to S7).
3. Agent runner in the store: run all on load, rerun Reconciliation on the live feed, "Run now" per agent.
4. Promote `review-queue`, `evidence-list`, `trace-panel`.
5. Build `/exceptions` and `/agents`. Finding actions: accept, dismiss with reason, escalate, verify callback.
6. Evidence chips open the related record in a drawer.

**Done when:** every planted scenario appears as a finding with reasons, evidence and a trace, and every action works and is logged.

### Phase 4: Payments, maker/checker, audit

1. Promote `approval-form`, `change-log`.
2. Build `/payments`: queue tabs by status, detail drawer, risk score, linked findings.
3. Rules: analyst submits, treasurer approves or rejects with a comment, nobody approves their own payment, payments with open high or critical findings can't be approved (show why).
4. Batch release of approved payments. Simulated bank acknowledgement after 3 seconds.
5. Build `/audit` with filters and CSV export. Every finding and payment detail shows its own audit timeline.
6. Role switcher fully wired. Auditor sees no action buttons at all.
7. Tests for every approval rule.

**Done when:** you can walk S1 end to end (flag, callback not confirmed, auto reject, audit trail) and the role rules can't be bypassed from the UI.

### Phase 5: Forecast and FX

1. Promote `line-chart`, `waterfall-chart`, `gauge-chart`.
2. Build `/forecast` with entity picker, base vs stress, minimum balance line, drivers waterfall.
3. Accepting the S6 recommendation creates a prefilled draft intercompany payment.
4. Build `/fx` with exposure vs hedged, policy band and the S7 recommendation.
5. Every chart has a "View as table" toggle.

**Done when:** S6 and S7 can be walked end to end and every chart passes the accessibility rules.

### Phase 6: Accessibility pass, polish and demo mode

1. Full keyboard and screen reader walkthrough of every route. Fix everything axe or manual testing finds.
2. Command palette, notification menu with new critical findings.
3. Loading skeletons and empty states everywhere.
4. **Guided demo:** a "Start demo" button that walks through the demo script below in 6 steps with a small step card and "Next". It navigates and highlights the relevant element. Skippable and keyboard friendly.
5. Responsive down to a 1280px laptop and a tablet in landscape. Mobile can show a "best on desktop" note on dense tables, but nav and the hub should still work.

**Done when:** axe is clean, the guided demo runs start to finish, and Lighthouse accessibility is 100.

### Phase 7 (optional): Ask Treasury

1. A serverless function (Vercel `api/ask.ts`) that calls the Claude API with the `@anthropic-ai/sdk` package. The key lives in a server env var only. Never ship it to the client.
2. The client sends the question plus a compact snapshot summary and the records that match keywords in the question. The model must answer only from that context and cite record IDs.
3. Render citations as `citation-chip`s that open the record drawer.
4. Mock mode: when `VITE_ASK_MODE=mock`, answer a set of 8 canned questions from local data so the static build still works.
5. Suggested questions: "Which entities are below minimum balance?", "Why is the Orchard payment on hold?", "How much EUR is unhedged?", "What did Daniel approve today?"

**Done when:** the chat answers with citations in both modes and never claims something the data doesn't show.

### Phase 8: Ship it

1. Deploy. Static build to GitHub Pages with a GitHub Actions workflow (base path `/TCC/`). If Phase 7 is live, deploy to Vercel instead.
2. Rewrite `README.md` as a case study: problem, users, the hub, the agents, bank grade patterns, accessibility, how the Design System was used and extended (link `docs/DS_CHANGES.md`), screenshots, a short demo video, how to run it.
3. Add a 60 to 90 second screen recording of the guided demo.

## 8. Demo script

This is the 2 minute story for interviews and the guided demo.

1. **Hub.** "This is Lumen's cash, about 4.6 billion USD across 12 entities and 5 banks. One feed, Crestwood Trust, is 26 hours stale, so every number that depends on it is flagged. You always know whether to trust a number."
2. **Exceptions.** "Overnight the agents raised these findings, ranked by risk. The top one: Orchard Packaging changed its bank details two days ago and a 1.84M payment is waiting. That's the classic invoice fraud pattern." Open the evidence and trace.
3. **Maker/checker.** As Priya, record the callback: not confirmed. The payment auto rejects. Switch to Daniel: the approve button was never available for it, and here's why.
4. **Reconciliation.** "Brightmart short paid by 4.6%. The agent didn't just fail the match. It proposed a partial match and opened a deduction case."
5. **Forecast.** "Brazil drops under its minimum in week 6. The agent suggests funding it from the Treasury Centre with an exact amount. Priya accepts and it becomes a draft payment for Daniel to approve."
6. **Audit.** As Mei, filter today's log. "Every agent finding and every human decision, who, when and why."

## 9. Stretch ideas

Only after Phase 8.

* Dual approval above USD 5M with a CFO persona.
* Dark mode using the Design System dark mode foundation.
* Bank connectivity screen showing message formats (camt.053, MT940, pain.001) and their validation.
* Policy editor: minimum balances, hedge band, risk thresholds, all audited.
* Notification digest: a daily summary the agents write for the treasurer.
