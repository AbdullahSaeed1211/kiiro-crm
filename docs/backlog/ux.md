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

### 12. The inbox keeps its own buttons

- Area: Design system. Effort: Moderate. Codes: S-01 S-02.
- Status: mostly fixed. No native `<select>` is left, and settings, onboarding, reports, sign-in, the workflow builder, the copy button and the calendar use `Button`. Date fields stay native on purpose: the phone date picker is better than any custom one. Left: the inbox (CSS modules: folder rail, thread rows, reader tools, compose close) and the notification card, which are bespoke layouts rather than buttons. Fix: move the inbox to `Button` and the shared tokens when the inbox is next redesigned, then add a lint rule against raw `<button>` in app code.

### 36. A repeating task hides missed periods

- Area: Tasks. Effort: Moderate. Reported by the owner on 2026-10-13: attendance was assigned in August and is still not done in October.
- Now: `packages/modules/work/src/commands/task-stage.ts:137-163` creates the next occurrence only when the current one is completed. A task nobody finishes stays one overdue task; August, September and October are not three missed periods, and nothing says a period was skipped.
- Evidence (2026-10-13, Mirch live): My tasks lists 70 overdue and 140 later tasks. "TikTok: publish posts (3 a week)" and the other weekly template tasks are one task each, all due Oct 9, and the monthly ones are all due Oct 31 (Collections on Nov 1). On the calendar they pile onto three days, past the four-per-day limit (`MAX_VISIBLE_EVENTS` in `CalendarMonth.tsx`), and a weekly task never appears on its other weeks.
- Fix: Create occurrences on schedule (a job, not completion), so each period exists and shows overdue on its own. Show "N missed" on the task and in the overdue notification. Completing an old occurrence must not spawn a duplicate for a period that already exists.
- Done when: a task repeating monthly and left untouched for three months shows three overdue occurrences, and the assignee gets one notification naming the count.

### 37. No "today" home view and no group by client

- Area: Tasks. Effort: Moderate. Reported by the owner on 2026-10-13.
- Now: My tasks has the overdue, today, next 7 days and later buckets, but the signed-in person lands on the dashboard cards, and All tasks cannot be grouped by client.
- Fix: A home view of the last task, today's tasks and pending tasks for the signed-in person, and a group-by toggle (client, person, project) on All tasks. The owner chose "by client" as the first grouping. Both reuse existing queries (`myTasksBuckets`).

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
