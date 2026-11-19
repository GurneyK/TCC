# Design System gap proposals

When TCC needs something the Design System doesn't have, propose it here first. Don't build it until Gurnoor approves.

## Template

### Proposed component name
* **Category:**
* **Use case in TCC:**
* **Closest existing entries:**
* **Likely props:**
* **Variants:**
* **Tokens:**
* **Accessibility requirements:**
* **Status:** proposed / approved / built / upstreamed

## Proposals from the working demo

These were composed in `src/features/shared` and `src/app` from existing Design System parts only. No new primitives, no new tokens. They are good candidates to become Design System patterns.

### Chart card with table view
* **Category:** Data display / charts
* **Use case in TCC:** Every chart needs a "View as table" toggle with the same data in a real table (spec section 6).
* **Closest existing entries:** `chart-container`, `table`
* **Likely props:** `title`, `description`, `chart`, `table`, `legend`, `toolbar`
* **Variants:** none
* **Tokens:** same as `chart-container`
* **Accessibility requirements:** toggle is a button with `aria-pressed` and `aria-controls`; the chart keeps `role="img"` with a takeaway label
* **Status:** built in TCC as `features/shared/ChartCard.tsx`

### Stale data badge
* **Category:** Feedback
* **Use case in TCC:** Any number built from a delayed source shows "Stale" with the last sync time.
* **Closest existing entries:** `badge`, `tooltip`
* **Likely props:** `lastSyncAt`, `source`, `now`
* **Variants:** none
* **Tokens:** `warning-*`
* **Accessibility requirements:** focusable so keyboard users reach the tooltip; tooltip text is in the DOM for screen readers
* **Status:** built in TCC as `features/shared/StaleBadge.tsx`

### Guided tour step card
* **Category:** Onboarding
* **Use case in TCC:** The 6 step guided demo.
* **Closest existing entries:** `card`, `badge`, `button`
* **Likely props:** `step`, `total`, `title`, `body`, `onNext`, `onBack`, `onClose`, `action`
* **Variants:** none
* **Tokens:** `brand-200` border, `shadow-h3lLg`
* **Accessibility requirements:** labelled landmark, takes focus on each step, Escape ends the tour, never traps focus
* **Status:** built in TCC as `app/GuidedTour.tsx`
