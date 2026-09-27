# UX backlog

24 findings are open: 2 critical, 11 major and 11 minor. They come from a review of the product UI at commit `cc6b2d6`, run through the Mirch Media tenant in Chromium at 1440px and 390px and compared against the reference products in `../references/`. The atomic reference-parity inventory stays in [the reference-parity backlog](../ux/reference-parity-backlog.md); this file lists what the review found, with a fix for each.

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

### 6. Only the record title can be edited in place

- Area: CRM records. Effort: Structural. Codes: R-03.
- Now: `RecordPageLayout.tsx:51` makes only the title editable. Lead fields are static text (`LeadRecordClient.tsx:49-83`). Changing one field on a contact or organization means going to `/edit`.
- Reference: Twenty's `record-field` and Frappe's `Field.vue`: every field is click-to-edit with an optimistic save.
- Fix: Generalise the per-field save in `DealControls.tsx` into a shared `PropertyField` component, then reuse it for task properties (T-01).

### 7. Converting a lead always creates new records

- Area: CRM records. Effort: Structural. Codes: R-01 R-02.
- Now: `ConvertDialog.tsx:105-106` sends `contact: { create: true }` and can only create an organization. The domain layer does de-duplicate contacts by email (test `T-CRM-3`), but the user never sees a match. Create forms give no duplicate warning.
- Reference: Frappe `ConvertToDealModal.vue:30-69`: a "Choose existing" toggle for both organization and contact.
- Fix: Add existing-record pickers to the dialog, and a "possible duplicate" banner on create when the email, phone or domain matches.

### 8. Lists have no search, filter or sort bar

- Area: Design system. Effort: Structural. Codes: T-04 R-06.
- Now: The `/tasks` toolbar has a view menu and a Columns button. `DataTable` already has an unused `toolbarStart` slot (`DataTable.tsx:34`). Projects has no controls at all.
- Reference: Twenty `RecordIndexViewBar.tsx:22-34` puts search, filter, sort and group in one bar on every object.
- Fix: Build one shared `ViewBar` for that slot and use it on tasks, leads, deals, contacts, organizations and projects.

### 10. The seed has no pipeline, so the CRM is never tested end to end

- Area: Tests. Effort: Quick.
- `crm-pipeline-data.ts:4-5` sets `LEADS = []` and `DEALS = []`, so the deal tests at `route-health.spec.ts:846` and `:946` have skipped since attempt 30. Their restore-in-`finally` logic is well built but never runs. Lead conversion, deal stages and board totals never run in a browser.

### 11. There's no neutral demo tenant

- Area: Platform. Effort: Quick.
- Add a `tenants/demo.jsonc` with `example.test` identities, fictional clients and a real pipeline, and make it the default for `seed:dev` and E2E. Tests should read expected values from the fixture. Keep Mirch as a real tenant, but stop using it as the test fixture. Running two tenants in CI would show the white-label setup actually works.

### 12. Many screens skip the design-system components

- Area: Design system. Effort: Structural. Codes: S-01 S-02.
- There are 32 native `<select>` elements across 18 files, against 26 `Select` and 27 `Combobox` uses. There are 4 native date inputs, while `calendar.tsx` and `popover.tsx` already exist. There are 55 raw `<button>` elements against 72 `Button` uses. The hotspots are the settings forms (`member-forms`, `workflow-editor`, `field-definition-editor`, `intake-forms`), `NewTaskForm`, `DealCreateDialog` and `reports`. Fix: add a `DatePicker`, migrate the call sites, and add a lint rule against raw `<select>` in app code.

### 13. Bulk actions are built but not used

- Area: Tasks. Effort: Quick. Codes: T-10.
- `DataTable` supports selection (`selectable`, `getSelectedRowIds`), but no page passes it. Frappe connects `ListSelectBanner` and `ListBulkActions` to its list (`TasksListView.vue:158-184`). Turn it on for tasks, and later for leads and deals, with bulk stage, assignee and delete actions.

### 14. No notes or comment threads

- Area: CRM records. Effort: Structural.
- `recordTabs()` (`record-view-primitives.tsx:108-155`) yields Activity, Tasks, Files and Email. There's no written note or @mention thread on records or tasks, although mentions notifications already exist (`collaboration/mentions.ts`). Frappe's activity tabs and Twenty's notes both have one.

### 15. Kanban hides columns and can't add to a column

- Area: Boards and calendar. Effort: Quick. Codes: B-05 B-09.
- Columns are a fixed `w-72` (`KanbanColumn.tsx:95`). At 1440px, Done is fully off-screen with no fade or peek. No column has a "+" button, although Plane and Twenty put one in the column header. Add an edge fade when the board overflows, and a stage-scoped quick-add in `KanbanColumn`'s header.

### 16. Tasks can't be rescheduled on the calendar

- Area: Boards and calendar. Effort: Structural. Codes: B-04.
- Plane's `day-tile.tsx:88-129` makes each day a drop target. Reuse the optimistic-update and rollback logic already in `KanbanBoard/board-state.ts` for `CalendarMonth`.

### 17. Each record type is created differently

- Area: CRM records. Effort: Quick. Codes: T-05 R-08.
- Tasks have both a New task page and an inline title-only input. Deals get a quick-create dialog (`DealCreateDialog.tsx`). Leads, contacts and organizations only have full-page forms. Frappe's `QuickEntryModal.vue` is one creation surface for everything. Choose one pattern: a quick-entry dialog everywhere, with "more fields" linking to the full page.

## Minor

### 19. Two kinds of view switcher

- Area: Design system. Effort: Quick. Codes: S-04 R-05.
- `TaskWorkspaceViews.tsx:22-40` is a real segmented control with `aria-current`. Leads uses two loose `<a>` tags (`LeadListControls.tsx:57-68`), and Deals uses a Button with an icon. Extract a shared `ViewSwitcher`.

### 20. Timeline is titled "Gantt"

- Area: Design system. Effort: Quick. Codes: S-03.
- The menu uses `copy.timeline` (`app-frame.tsx:44`), but the page and view id use `copy.gantt` (`timeline/page.tsx:18,43`). The Kanban breadcrumb reads "Table › Kanban", treating one view as nested inside another. Use one label source per view.

### 22. Settings rail reuses icons, and "Week starts on" is a number field

- Area: Design system. Effort: Quick. Codes: S-05 S-01.
- `BriefcaseBusiness` is used five times in `settings-nav.tsx:16,18,19,32,34`. `settings/general/page.tsx:58` uses `type: 'number'` for the week start, which shows `0`. Give each section its own icon and use a weekday `Select`.

### 23. Gantt bars are one colour and clip inconsistently

- Area: Boards and calendar. Effort: Quick. Codes: B-07 B-08 S-07.
- `gantt-theme.css:24-28` sets every bar to `var(--primary)`, while an 8-colour `--stage-*` scale already exists in `tokens.css:3-17`. Plane colours each bar by state (`gantt/blocks.tsx:53`). Add `stageColor` to `GanttBar` and apply one ellipsis rule to labels.

### 24. Kanban cards spell out assignees

- Area: Boards and calendar. Effort: Quick. Codes: B-06.
- `tasks/board/page.tsx:74-79` prints "Assignees: Web Development Lead" on its own line. Twenty's `RecordBoardCardBody` shows an avatar chip inline with the other card details.

### 25. Deals are built differently from leads

- Area: CRM records. Effort: Quick. Codes: R-04 R-07 R-09.
- The deal stage picker is a native select (`DealControls.tsx:66-85`), while leads use `StageSelect`. Mark lost is a form inside the side card (`DealClosingControls.tsx:78-121`), while leads use `LostReasonDialog`. Deal activity is a separate `ActivityCard` (`deals/[id]/page.tsx:20-46`) that prints raw verbs and has no load-more. Move deals onto the shared components.

### 26. Projects list repeats "Progress" in every row

- Area: CRM records. Effort: Quick. Codes: R-06.
- The column header says Progress (`projects/page.tsx:118`), and the cell prints it again (lines 26-27). Project members are managed with two native selects. There's no search. Remove the repeated label and add the shared `ViewBar` and a member picker.

### 30. Placeholders read as entered values

- Area: Design system. Effort: Quick. Codes: S-08 R-10.
- `product.css:14` overrides shadcn's `--muted-foreground` with a darker `oklch(0.48 …)`, and example values like "Jane" and "Acme Inc." look like real data. Keep one definition of the token, lighten placeholders, and use example-style hints.

### 32. The time zone list is duplicated and force-adds one zone

- Area: Platform. Effort: Quick.
- The same block is in `apps/web/src/i18n/timezones.ts` and `packages/adapters/payload/src/collections/values.ts`, and both append `'Asia/Kolkata'` to `Intl.supportedValuesOf`. Keep one copy in `@ops/kernel`, and don't special-case a zone unless a runtime is known to lack it.

### 33. Duplicate React key on mobile timeline

- Area: Boards and calendar. Effort: Quick. Codes: B-10.
- Seen in the browser console at 390px. Our code keys by id, so the likely source is the SVAR grid's internal rows when toggling Grid and Chart. Reproduce it before fixing.

### 34. Closing a task panel on phones loses focus

- Area: Tasks. Effort: Quick. Codes: A-04.
- In mobile WebKit (390px), pressing Escape on a task panel opened from `/calendar` returns to the calendar, but the task link is not focused; desktop Chromium focuses it. `app-frame.tsx` focuses `[data-task-link-id]` on the pathname change, and something focuses after it. Found by `route-health.spec.ts` "task details preserve origin", which fails on the mobile project at `v0.2.0`.

### 35. The phone timeline logs a React key warning

- Area: Tasks. Effort: Quick. Codes: R-10.
- At 390px `/timeline` switches the Gantt to compact mode and React logs "Each child in a list should have a unique key" from inside `@svar-ui/react-gantt`. The route-health budget test counts console errors, so its mobile run fails. Find which prop (columns, compact grid config) produces unkeyed children, or report it upstream and filter that one message in the test.
