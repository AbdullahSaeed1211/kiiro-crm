# UX backlog

8 findings are open: 1 critical, 4 major and 3 minor. They come from a review of the product UI at commit `cc6b2d6`, run through the Mirch Media tenant in Chromium at 1440px and 390px and compared against the reference products in `../references/`. The atomic reference-parity inventory stays in [the reference-parity backlog](../ux/reference-parity-backlog.md); this file lists what the review found, with a fix for each.

Critical means a core workflow is broken or a staff user hits it on day one. "Quick" is about a day or less; "Structural" needs a new shared component or data model. Codes such as T-01 or R-03 group related symptoms: T tasks, B boards and calendar, R records, S shell. Numbers are stable identifiers, so gaps mean a finding was fixed. Delete a finding in the commit that fixes it.

Reference files are cited to show observed behavior. Copy code only from MIT or Apache-2.0 sources, as [AGENTS.md](../../AGENTS.md#references-and-licences) describes; re-implement the rest.

## Critical

### 3. The E2E suite can't see broken layouts

- Area: Tests. Effort: Quick.
- Now: `route-health.spec.ts:351-356` checks that an "Assignees" heading is visible and that `[data-slot="sheet-content"]` has no matches. The broken page passes both. It saves a screenshot, but nothing ever compares it. Most routes get only a "heading is visible" check.
- Fix: Add `toHaveScreenshot` diffs for the core surfaces, and geometry checks: the content box must not intersect the header, and a standalone route must have no Close button. The file already uses bounding boxes and layout-shift checks for the panel, so this reuses a known technique.
- Status: partly fixed. A geometry check now asserts the standalone task page does not overlap the app header and has no Close button; it fails until the page gets its own layout. Screenshot diffs are not added yet.

## Major

- Status (2026-09-27, local dev server): four `route-health.spec.ts` runs fail at `v0.2.0` before any change: "workspace settings reopen" (desktop; two `Time zone` comboboxes match), "settings IA and command palette" (mobile; no `Workspace` heading in the settings navigation), and UX 34 and 35. The suite stops at the first failure per project, so later tests only run with `--grep-invert`.

### 8. Two lists still have their own search row

- Area: Design system. Effort: Moderate. Codes: T-04 R-06.
- Now: Contacts, organizations, deals and projects share `ListViewBar` (search, filters, sort; the state lives in the URL). Leads keep `LeadListControls` because they filter by several stages at once, owner and source and save views; tasks keep their view menu. Deals have no sort because the deals query does not sort yet.
- Reference: Twenty `RecordIndexViewBar.tsx:22-34` puts search, filter, sort and group in one bar on every object.
- Fix: Teach `ListViewBar` a multi-select stage filter and a saved-views slot, move leads and tasks onto it, and add a sort to the deals query.

### 12. Many screens skip the design-system components

- Area: Design system. Effort: Structural. Codes: S-01 S-02.
- There are 32 native `<select>` elements across 18 files, against 26 `Select` and 27 `Combobox` uses. There are 4 native date inputs, while `calendar.tsx` and `popover.tsx` already exist. There are 55 raw `<button>` elements against 72 `Button` uses. The hotspots are the settings forms (`member-forms`, `workflow-editor`, `field-definition-editor`, `intake-forms`), `NewTaskForm`, `DealCreateDialog` and `reports`. Fix: add a `DatePicker`, migrate the call sites, and add a lint rule against raw `<select>` in app code.

### 13. Bulk actions on tasks stop at "Mark done"

- Area: Tasks. Effort: Quick. Codes: T-10.
- Status: partly fixed. Leads have bulk assign and stage move, and the task table has a bulk Mark done. Deals now have bulk assign and stage move. Still missing: bulk assignee and priority for tasks.
- Fix: add them to `TaskBulkTable` the same way, each through the module command so access and version checks apply per record.

### 16. Tasks can't be rescheduled on the calendar

- Area: Boards and calendar. Effort: Structural. Codes: B-04.
- Plane's `day-tile.tsx:88-129` makes each day a drop target. Reuse the optimistic-update and rollback logic already in `KanbanBoard/board-state.ts` for `CalendarMonth`.

## Minor

### 33. Duplicate React key on mobile timeline

- Area: Boards and calendar. Effort: Quick. Codes: B-10.
- Seen in the browser console at 390px. Our code keys by id, so the likely source is the SVAR grid's internal rows when toggling Grid and Chart. Reproduce it before fixing.

### 34. Closing a task panel on phones loses focus

- Area: Tasks. Effort: Quick. Codes: A-04.
- In mobile WebKit (390px), pressing Escape on a task panel opened from `/calendar` returns to the calendar, but the task link is not focused; desktop Chromium focuses it. `app-frame.tsx` focuses `[data-task-link-id]` on the pathname change, and something focuses after it. Found by `route-health.spec.ts` "task details preserve origin", which fails on the mobile project at `v0.2.0`.

### 35. The phone timeline logs a React key warning

- Area: Tasks. Effort: Quick. Codes: R-10.
- At 390px `/timeline` switches the Gantt to compact mode and React logs "Each child in a list should have a unique key" from inside `@svar-ui/react-gantt`. The route-health budget test counts console errors, so its mobile run fails. Find which prop (columns, compact grid config) produces unkeyed children, or report it upstream and filter that one message in the test.
