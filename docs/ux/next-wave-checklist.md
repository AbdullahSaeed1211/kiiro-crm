# Next-wave UX reference checklist

This checklist is the browser-evidence boundary for the next UX pass. A status applies to the complete item, not to a passing sub-flow. `Pass` requires an observed browser interaction for the full contract. `Gap` means evidence or behavior shows the contract is incomplete. `Deferred` means the browser walkthrough has not been done. A test or code inspection alone does not establish visual conformance.

This checklist is a follow-up inventory, not a production acceptance report. Repository behavior and browser paths were checked against commit `b77110b` on 2026-09-23. The linked reference pages were opened on 2026-09-23 and may change. Check the application at desktop and 390px unless an item says otherwise. Record screenshots outside the repository or add a short click path with the observed result. Restore test data after persistence checks.

## P0: interaction integrity

### 1. Contextual task and record open

- **Status:** Gap
- **Reference behavior:** [shadcn Dialog](https://ui.shadcn.com/docs/components/base/dialog) and [Drawer](https://ui.shadcn.com/docs/components/base/drawer) overlay the current surface; the background does not reflow.
- **Ours before:** Calendar task navigation replaced the calendar route. The original path was recorded in [the reference audit](../ux-reference-audit.md).
- **Contract:** Opening from Calendar, My Tasks, task table and board, search, and notifications keeps the source mounted and overlays a sheet or modal. The task URL is deep-linkable. Back and Forward, Escape, backdrop, close button, and focus restoration work. The direct task URL renders the canonical page. At 390px, open and close cause no interaction layout shift.
- **Browser evidence:** On desktop Chromium and mobile WebKit, the path `Calendar > click seeded task > Escape` kept Calendar mounted, recorded zero layout-shift score on open and close, and returned focus to the task link. Desktop backdrop dismissal passed. The path `paste /tasks/:id into address bar > reload` rendered the canonical task page. Browser Back and Forward, close button, and focus return passed. The visible browser also showed Calendar restored after Escape. Scroll containment is not checked. The other source surfaces have no recorded modal walkthrough, so the complete item remains a gap. The implementation is in `apps/web/src/app/(app)/@modal/(.)tasks/[id]/page.tsx` and `apps/web/src/app/(app)/tasks/[id]/TaskDetailDrawer.tsx`; the browser spec is `tests/e2e/customer/route-health.spec.ts`.
- **Next path:** Repeat `My Tasks`, `Tasks > table`, `Tasks > board`, global search, and notifications at desktop and 390px; check all dismissal methods and direct URL in each context. Capture open and closed screenshots and a PerformanceObserver layout-shift result.

### 2. Visible control and state integrity

- **Status:** Deferred
- **Reference behavior:** [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) specifies semantic controls, labels, visible focus, inline form errors, keyboard and touch alternatives, stateful URLs, and explicit next steps in error messages.
- **Ours before:** No whole-app control-by-control browser inventory is recorded. Specific task and timezone paths are covered above and below; they do not prove every visible control works.
- **Contract:** Every visible control performs its labeled action. Forms show validation and success or failure feedback. Selects work with pointer and keyboard. No dead actions, raw UUIDs, stale counts, silent failures, hydration warnings, or console errors. Check empty, loading, populated, error, permission-denied, and slow-network states.
- **Browser evidence:** No exhaustive action crawl or state screenshots are recorded. Do not infer this item from route health, lint, or build results.
- **Next path:** At each route in items 4 through 10, click every visible control, submit forms, reload persisted changes, and inspect console/network results. Force the named empty, loading, error, denied, and throttled states where safe.

### 3. Board movement and alternatives

- **Status:** Gap
- **Reference behavior:** [Twenty Kanban views](https://docs.twenty.com/user-guide/views-pipelines/capabilities/kanban-views) use a board for stage-oriented work. Drag is a shortcut, not the only way to change a stage.
- **Ours before:** Desktop cards exposed drag but hid the explicit move action. Playwright's generic drag helper did not trigger the product's drag sensor.
- **Contract:** Drag and a keyboard/touch-accessible `Move to…` action both update stage. Counts and aggregates update. Persistence survives reload. A rejected move rolls back and explains the failure. Dragging a card does not open it accidentally. Stage columns come from configured data.
- **Browser evidence:** In the visible desktop browser, `Tasks > Board > drag “Write service page copy” from In progress to Review > reload` left the card in Review and changed the two column counts; `Move to… > In progress` restored the seeded state. Existing desktop and mobile browser specs exercised `Move to…`, reloaded, and verified persistence. Failure rollback, keyboard-only movement, accidental-open behavior, aggregate values, and configured stages were not checked. The move action is in `packages/ui/src/composites/KanbanBoard/KanbanCardItem.tsx`; browser specs are in `tests/e2e/spike/smoke.spec.ts`.
- **Next path:** Repeat drag with keyboard and touch alternatives at 390px. Force a failed update and verify rollback plus an explanation. Drag without releasing over a card and verify no detail opens. Confirm counts and any monetary aggregate after reload.

## P1: core information architecture and CRM flows

### 4. Sidebar, navigation, and global search

- **Status:** Deferred
- **Reference behavior:** [Twenty navigation](https://docs.twenty.com/user-guide/layout/capabilities/navigation), [shadcn Sidebar](https://ui.shadcn.com/docs/components/base/sidebar), and [shadcn Command](https://ui.shadcn.com/docs/components/base/command) provide grouped navigation and searchable command access.
- **Ours before:** A desktop app sidebar and global search control were observed, but no full navigation or search walkthrough is recorded.
- **Contract:** Sidebar hierarchy is stable, active location is clear, Settings are grouped, tenant branding is visible, and narrow screens have a usable collapse pattern. Cmd/Ctrl+K opens search/actions. Search supports clear, no-results, keyboard selection, and close without losing context.
- **Browser evidence:** No click-path evidence is recorded for grouped Settings, responsive collapse, or the search states.
- **Next path:** `Dashboard > inspect active sidebar item > collapse sidebar > Settings > Cmd/Ctrl+K > search a seeded record > clear > search nonsense > Escape`, at desktop and 390px.

### 5. Record lists and saved views

- **Status:** Deferred
- **Reference behavior:** [Twenty table views](https://docs.twenty.com/user-guide/views-pipelines/capabilities/table-views), [filters and sorting](https://docs.twenty.com/user-guide/views-pipelines/capabilities/filters-and-sorting), and [Frappe saved views](https://docs.frappe.io/crm/view) describe configurable lists and retained views.
- **Ours before:** No end-to-end list configuration and return-to-view walkthrough is recorded.
- **Contract:** Leads, deals, contacts, organizations, projects, and tasks expose scannable fields, search, relevant filters and sorting, counts, pagination or large-data handling, and clear selection feedback. View switches preserve state. Where supported, named or pinned saved filters, sorts, and columns reappear after leaving and returning.
- **Browser evidence:** No list-state persistence screenshots or click paths are recorded for the full set of collections.
- **Next path:** For each collection, `open list > search > filter > sort > change view > return > reload`; verify retained state, counts, selection actions, empty and large-data behavior.

### 6. Pipeline boards and currency

- **Status:** Gap
- **Reference behavior:** [Twenty Kanban views](https://docs.twenty.com/user-guide/views-pipelines/capabilities/kanban-views) and the [Frappe Deal guide](https://docs.frappe.io/crm/deal) show stage-oriented deal boards and deal values.
- **Ours before:** A desktop task move was manually observed and persisted. Deal create and lead-conversion code paths currently default currency to `USD`, while the Mirch tenant setting is `INR`; this is recorded in [the reference audit](../ux-reference-audit.md). The currency behavior has not been verified in the browser.
- **Contract:** Board stages are legible and data-driven. Cards show useful fields, counts, and the relevant monetary value. Drag and explicit move actions persist. Tenant currency is used end-to-end for new and converted deals; existing records keep their own currency unless a migration policy is approved.
- **Browser evidence:** Task card movement and reload persistence passed as described in item 3. No deal-board value, custom-stage, create-deal, conversion, or currency-default browser path is recorded.
- **Next path:** `Deals > Board > inspect stage labels/counts/value > move a deal > reload > create deal > convert lead > inspect currency and reports`. Use a non-production fixture and restore it afterward.

### 7. Record details and CRM lifecycle

- **Status:** Deferred
- **Reference behavior:** [Frappe Lead](https://docs.frappe.io/crm/lead), [Frappe Deal](https://docs.frappe.io/crm/deal), and [Twenty record pages](https://docs.twenty.com/user-guide/layout/capabilities/record-pages) describe record context, related work, and lifecycle actions.
- **Ours before:** No full lead-to-deal or record-edit browser walkthrough is recorded in this audit.
- **Contract:** Record details show key fields, related people, organizations, projects and tasks, and chronological activity. Inline edits provide save and error feedback. Tabs retain state and identifiers remain readable. Lead conversion links or creates the intended contact and organization while preserving context. Marking a deal Lost requires a reason. When tenant email is disabled, no active email-compose affordance is shown.
- **Browser evidence:** No observed click path currently establishes these record-level outcomes. Code and route coverage are not substitutes for the requested interaction evidence.
- **Next path:** `open seeded lead > edit field > save > reload > inspect related records/activity > convert > inspect links`; then `open deal > set Lost > inspect required reason`; repeat with outbound email disabled and inspect visible actions.

### 8. Agency projects, staff, and permissions

- **Status:** Gap
- **Reference behavior:** [Twenty member management](https://docs.twenty.com/user-guide/settings/capabilities/member-management) and [Frappe team invitations](https://docs.frappe.io/crm/inviting-your-team) describe member lifecycle and invitation flows.
- **Ours before:** Product feedback identified missing or unclear staff/project workflows. No complete browser evidence establishes multi-project assignment, role labels, invite lifecycle, or query-level permission enforcement.
- **Contract:** Named client projects support staff working across multiple projects. PR, Dev, and Lead labels come from tenant data. Project tasks are scoped correctly. My Tasks reflects the signed-in assignee's actual workload. Permissions restrict server queries and actions. Invites show role and pending, accepted, or revoked state, with a safe copyable invitation path when outbound email is disabled.
- **Browser evidence:** No click path proving invite, revoke, multi-project workload, or denied-access behavior is recorded.
- **Next path:** `Settings > Members > invite with role > copy link > accept as second user > assign that user across two named projects, for example Austin Optics and another client > compare My Tasks > revoke or deny access > attempt direct URL/API`. Use test accounts and confirm unauthorized queries return no protected data.

## P2: product consistency

### 9. Settings and workspace capabilities

- **Status:** Gap
- **Reference behavior:** [shadcn Combobox](https://ui.shadcn.com/docs/components/base/combobox) supports searchable option selection and a no-results state.
- **Ours before:** Time zone was a native select without search. Workspace currency is persisted as free text; deal create and conversion default to USD. Other settings routes and disabled capabilities have not had one coherent browser audit.
- **Contract:** Settings consistently cover branding, timezone and currency, modules and terminology, members and groups, views and workflows, notifications, intake, email, import, and profile. Timezone and currency choices are searchable validated values. Disabled capabilities explain why they are unavailable and what enables them. Use existing accessible form/select/combobox primitives.
- **Browser evidence:** Existing desktop and mobile browser specs searched for `Kolkata`, selected `Asia/Kolkata`, and confirmed that value without mutating workspace settings. No currency-selection, validation, default propagation, branding, or all-settings walkthrough is recorded. The control is `apps/web/src/app/(app)/settings/searchable-select.tsx`; the browser spec is `tests/e2e/customer/route-health.spec.ts`.
- **Next path:** `Settings > General > timezone search/select > currency search/select > save > reload > create deal`; then visit each settings route and test enabled, disabled, invalid, and permission-denied states.

### 10. Calendar, timeline, and task dates

- **Status:** Gap
- **Reference behavior:** [Twenty Calendar view](https://docs.twenty.com/user-guide/views-pipelines/capabilities/calendar-view) presents date-based work in a calendar view.
- **Ours before:** No broad timezone, responsive overflow, or date-boundary audit is recorded.
- **Contract:** Calendar, timeline, due-state labels, and task dates respect the workspace timezone and do not jump during hydration. Create, edit, and move persist. Desktop and 390px layouts have no unintended horizontal overflow.
- **Browser evidence:** The task-modal Calendar path passed without recorded interaction layout shifts (item 1). The existing desktop timeline browser interaction moved a task bar, reloaded to confirm persistence, and restored the original seeded dates. Timezone-boundary cases, direct create/edit, due states, and mobile overflow were not checked. The timeline browser spec is in `tests/e2e/spike/smoke.spec.ts`.
- **Next path:** `Settings > General > choose non-UTC timezone > Calendar > create/edit/move task across local midnight > reload > inspect due state`; repeat on the timeline and at 390px while checking document width.

## Evidence and licensing rules

- Keep the evidence label literal: a browser-observed path, an automated browser path, a code-only inference, or not checked. Do not describe unit tests, route health, lint, or a production build as browser evidence.
- For each new observation, record viewport, starting route, action, visible result, reload result when state changes, and whether the original data was restored. Screenshots may be attached separately; do not commit customer data or credentials.
- Use reference applications to compare observable behavior. Do not copy Twenty or Frappe CRM application code into this proprietary product without an explicit licensing decision. Reuse local permissively licensed UI primitives with their existing notices and provenance.
- See the [reference audit](../ux-reference-audit.md) for the current source and license inventory.
- A completed row needs browser evidence for the whole contract, including relevant empty, loading, error, permission, keyboard/touch, and narrow-screen states. Partial success remains `Gap`.
