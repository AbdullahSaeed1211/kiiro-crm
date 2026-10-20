# UX backlog

9 findings are open: 1 critical, 4 major and 4 minor. They come from a review of the product UI at commit `cc6b2d6`, run through the Mirch Media tenant in Chromium at 1440px and 390px and compared against the reference products in `../references/`. The atomic reference-parity inventory stays in [the reference-parity backlog](../ux/reference-parity-backlog.md); this file lists what the review found, with a fix for each.

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

### 12. The inbox keeps its own buttons

- Area: Design system. Effort: Moderate. Codes: S-01 S-02.
- Status: mostly fixed. No native `<select>` is left, and settings, onboarding, reports, sign-in, the workflow builder, the copy button and the calendar use `Button`. Date fields stay native on purpose: the phone date picker is better than any custom one. Left: the inbox (CSS modules: folder rail, thread rows, reader tools, compose close) and the notification card, which are bespoke layouts rather than buttons. Fix: move the inbox to `Button` and the shared tokens when the inbox is next redesigned, then add a lint rule against raw `<button>` in app code.

### 37. All tasks cannot be grouped by person

- Area: Tasks. Effort: Moderate. Reported by the owner on 2026-10-13.
- Now: All tasks has a Group by control (None or Related record) that shows one heading per project, lead or deal, sorted by name. My tasks groups by due date or client, and the dashboard leads with a Due today card.
- Status: partly fixed. Left: grouping All tasks by assignee.
- Fix: Add an assignee sort to the tasks list query, then a third Group by option in `TaskGroupToggle` that sets `group` on each row from the assignee name. A task with several assignees needs a rule for which one it groups under.

### 39. Due dates shift a day in time zones behind UTC

- Area: Tasks. Effort: Moderate. Codes: T-07.
- Now: A due date picked in the task form is stored as that day at 00:00 UTC (`NewTaskForm.tsx`), and screens show it with `timeZone: 'UTC'`, so the date reads as picked. The Overdue, Today and Next 7 days buckets (`myTasksBuckets`) and the dashboard cards instead take the workspace-zone date of that timestamp. In a zone ahead of UTC, such as Asia/Kolkata, the two agree. In a zone behind UTC, such as America/New_York, a task due Oct 20 (Oct 20 00:00 UTC) falls on Oct 19 locally, so it counts as due a day early and is overdue on the morning it is due.
- Fix: Pick one rule and apply it everywhere. Either bucket by the UTC date of `dueAt`, which matches how the date is shown, or store the due date as local midnight in the workspace zone and show it in that zone, which matches decision D-09. Then check every place that decides what is overdue against the chosen rule: `myTasksBuckets`, `dashboard-work.ts`, `report-task-counts.ts` and `client-dashboard.ts`.

## Minor

### 33. Duplicate React key on mobile timeline

- Area: Boards and calendar. Effort: Quick. Codes: B-10.
- Seen in the browser console at 390px. Our code keys by id, so the likely source is the SVAR grid's internal rows when toggling Grid and Chart. Reproduce it before fixing.

### 34. Closing a task panel on phones loses focus

- Area: Tasks. Effort: Quick. Codes: A-04.
- In mobile WebKit (390px), pressing Escape on a task panel opened from `/calendar` returns to the calendar, but the task link is not focused; desktop Chromium focuses it. `app-frame.tsx` focuses `[data-task-link-id]` on the pathname change, and something focuses after it. Found by `route-health.spec.ts` "task details preserve origin", which fails on the mobile project at `v0.2.0`.

### 35. The phone timeline logs a React key warning

- Area: Tasks. Effort: Quick. Codes: R-10.
- Status: reproduced on 2026-10-01 in mobile WebKit by switching Chart then Grid on `/timeline`. The warning names a minified component inside the Gantt library (`Lt`), so no key in our code is missing; React prints it in development only, so production users never see it. What remains is filtering that one message in the route-health console budget or reporting it upstream.
- At 390px `/timeline` switches the Gantt to compact mode and React logs "Each child in a list should have a unique key" from inside `@svar-ui/react-gantt`. The route-health budget test counts console errors, so its mobile run fails. Find which prop (columns, compact grid config) produces unkeyed children, or report it upstream and filter that one message in the test.

### 38. Inline English remains outside the copy files

- Area: Copy. Effort: Moderate. Codes: R-11.
- Now: [AGENTS.md](../../AGENTS.md#pitfalls) requires every user-facing string to live in a per-feature `*-copy.ts` with an `en` and an `es` entry, so a workspace set to Spanish shows English wherever a component holds text. These still do:
  - the shared record primitives in `record-view-primitives.tsx` (`Meta`, `RelationList`, `recordTabs` tab names, the activity feed labels), which the contact, organization, lead and deal pages all call;
  - `contact-record-view.tsx`, `organization-record-view.tsx` and `directory-form.tsx`;
  - `deals/page.tsx` and `projects/page.tsx` (column headers, filters, sort options);
  - most pages under `settings/`.
- Fix: Give the record primitives one `record-copy.ts` and pass the chosen catalog in. `recordTabs` is called from server pages and from the client `LeadRecordClient`, so the catalog arrives as an argument, not through a hook. Then move each page's strings into its own copy file, following `project-page-copy.ts`.
