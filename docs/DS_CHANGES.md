# Design System changes

Every Design System component promoted or changed in TCC gets logged here. These are candidates to upstream back into the Design System.

Rules for a promotion: add typed props, keep the old hardcoded data as the default, keep markup and token classes the same, keep or improve accessibility.

All of these render exactly as before when used with no props.

| Component | File | Change | Props added | Why | Upstream? |
|---|---|---|---|---|---|
| Table | `ui/table/Table.tsx` | Promote + a11y | `caption`, `getRowKey`, `onRowClick`, `isRowSelected`, `emptyMessage`, column `align`, column `render` | Treasury tables need captions, numeric alignment, keyboard activatable rows (Enter and Space) and an empty state. Right aligned cells use tabular numbers and don't wrap. | Yes |
| Drawer | `ui/drawer/Drawer.tsx` | Promote + a11y | `description`, `footer` | Drawer now traps focus, closes on Escape, returns focus to the opener, and labels itself from its title. Sticky footer holds approval actions. | Yes |
| Modal | `ui/modal/Modal.tsx` | Promote + a11y | `description`, `footer` | Same focus trap and Escape handling as Drawer. `aria-describedby` points at the description. The old Cancel and Confirm footer stays the default. | Yes |
| useDialogFocus (new) | `ui/drawer/useDialogFocus.ts` | New hook | n/a | Shared focus trap for Drawer and Modal. Keeps a stack so only the top dialog reacts to keys when a record drawer opens over another drawer. | Yes |
| SegmentedControl | `ui/segmented-control/SegmentedControl.tsx` | Promote | `value`, `onChange` | Controlled use. Buttons expose `aria-pressed`. | Yes |
| Tabs | `ui/navigation/Tabs.tsx` | Promote | `ariaLabel`, `onSelect`, item `value` | Status tabs on Payments and Exceptions. `aria-selected` is always a boolean. | Yes |
| Sidebar | `ui/layout/Sidebar.tsx` | Promote | `subtitle`, `navLabel`, item `href`, `icon`, `count` | Items render as links with `aria-current="page"` when active. Hash links work with the hash router without coupling the Design System to a router. | Yes |
| KpiStrip | `ui/dashboard/KpiStrip.tsx` | Promote | `metrics`, `ariaLabel`, metric `helper` | Real KPIs. The helper line carries "Includes stale data from 1 source" and the Stale badge. Delta is optional. | Yes |
| InsightCard | `ui/dashboard/InsightCard.tsx` | Promote | `actionLabel`, `onAction` | The action button was inert. | Yes |
| DataSourceCard | `ui/dashboard/DataSourceCard.tsx` | Promote | `statusLabel`, `volumeLabel`, `policyLabel`, `policyValue`, `onView`, `viewLabel`, `onSync`, `syncLabel`, `syncing`, `showSync` | Live source stats, Retry sync, and a read only mode with no action buttons for auditors. | Yes |
| ActivityFeed | `ui/dashboard/ActivityFeed.tsx` | Promote + a11y | `title` | Meta text moved from `gray-400` to `gray-500` to pass contrast. Row keys include the description so repeated actions don't collide. | Yes |
| TracePanel | `ui/agent/TracePanel.tsx` | Promote + a11y | `title`, `badge`, `items`, item `warning` and `skipped` status | Real agent traces. Status is announced as text, not only by icon. Icon tile no longer stretches with long text. | Yes |
| EvidenceList | `ui/agent/EvidenceList.tsx` | Promote | `items`, `title`, item `onOpen`, `openLabel` | Evidence chips open the underlying record in a drawer. Uses CitationChip's own button instead of nesting buttons. | Yes |
| CitationChip | `ui/agent/CitationChip.tsx` | a11y | none | Source and confidence text moved from `gray-400` to `gray-600` for contrast. | Yes |
| LineChart | `ui/charts/LineChart.tsx` | Promote | `series`, `xLabels`, `threshold`, `formatValue`, `ariaLabel`, `className` | Forecast lines, a dashed base vs stress comparison and a minimum balance line. Points under the threshold turn red. Callers pass a takeaway sentence as the label. | Yes |
| WaterfallChart | `ui/charts/WaterfallChart.tsx` | Promote | `steps`, `ariaLabel`, `className` | Forecast drivers. Scales to any magnitude, including negative closes. The plot widens with the step count so labels never collide. | Yes |
| StackedBarChart | `ui/charts/StackedBarChart.tsx` | Promote | `bars`, `ariaLabel`, segment `percent` and `tone`, bar `marker` | Hedge coverage per currency with a 70% target marker. Widths moved from fixed fractions to percentages. | Yes |
| Timestamp | `ui/timestamp/Timestamp.tsx` | Promote | `dateTime` | The `<time>` element had a hardcoded machine date. | Yes |
| EmptyState | `ui/empty-state/EmptyState.tsx` | Promote | `onAction` | The action button was inert. | Yes |
| ResultState | `ui/feedback/ResultState.tsx` | Promote | `actions` | CSV import summary needs its own next steps. | Yes |
| FileUpload | `ui/forms/FileUpload.tsx` | Promote | `accept`, `onFile` | Reads the picked file. Resets the input so the same file can be picked twice. | Yes |
| Alert | `ui/alert/Alert.tsx` | Promote | `onDismiss` | The dismiss button was inert. | Yes |
| Badge | `ui/badge/Badge.tsx` | Fix | none | Added `whitespace-nowrap`. Badges were wrapping inside table cells ("94 of / 100"). | Yes |
| Drawer, Modal portal | `ui/drawer/Drawer.tsx`, `ui/modal/Modal.tsx` | Fix | none | Render into `document.body` with a portal. Inside a `space-y-*` parent the fixed backdrop picked up a top margin and left a strip undimmed. | Yes |
| Drawer, Modal close | `ui/drawer/Drawer.tsx`, `ui/modal/Modal.tsx` | a11y | none | Close icon moved from `gray-400` to `gray-500` to reach 3:1 non text contrast. | Yes |
| Global styles | `src/index.css` | a11y | none | `.focus-ring` now adds a 2px `brand-700` outline on top of the soft ring, so focus is visible on white (WCAG 2.4.11). Added a `prefers-reduced-motion` rule and the guided demo highlight style. | Yes |

## Redesign pass (13 Nov 2026)

Same rules: every new prop is optional and the default render is unchanged.

| Component | File | Change | Props added | Why | Upstream? |
|---|---|---|---|---|---|
| Avatar | `ui/avatar/Avatar.tsx` | Promote | `tone` (brand, info, success, warning, gray) | Each persona in the user switcher gets its own color. Default stays brand. | Yes |
| UserMenu | `ui/navigation/UserMenu.tsx` | Promote + a11y | `header`, `children`, `footer` (null hides it), `className`, `id`, `aria-label` | Powers the bottom left user switcher. When labelled it renders as `role="group"`. | Yes |
| Sidebar | `ui/layout/Sidebar.tsx` | Promote | `sections`, `header`, `footer`, `variant` ("card" or "panel"), item `countTone`, `countLabel` | Grouped nav (Today, Cash and risk, Controls) with colored counts. The panel variant fills its column, scrolls the nav and pins the footer. | Yes |
| KpiStrip | `ui/dashboard/KpiStrip.tsx` | Promote | metric `icon`, `iconTone`; `value` accepts a node | Tinted icon tiles and animated count up values. Values use tabular numbers. | Yes |
| Table | `ui/table/Table.tsx` | Promote | column `nowrap`, `width`; table `layout` ("auto" or "fixed") | Keeps IDs and dates on one line and stops columns shifting between tabs. | Yes |
| LineChart | `ui/charts/LineChart.tsx` | Promote | `width`, `area` | Wider plot on desktop so labels stay readable, a soft area fill, and a draw in animation that is off under reduced motion. | Yes |
| Global styles | `src/index.css` | Add | none | Motion utilities (`animate-rise`, `animate-pop`, `animate-grow`, `stagger`, `lift`, `sheen`, `live-pulse`, `draw-line`), `pane-sticky` for split panes and `scrollbar-thin`. All disabled under reduced motion. | Yes |
| ChartCard | `features/shared/ChartCard.tsx` | a11y | none | The table toggle is an icon button labelled "Show {title} as a table" or "as a chart". | n/a, TCC only |
| Tabs | `ui/navigation/Tabs.tsx` | Responsive | none | Tabs scroll sideways on narrow screens instead of wrapping to a second row. Labels never wrap. | Yes |
