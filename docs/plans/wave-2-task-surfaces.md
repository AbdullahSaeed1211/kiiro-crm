# Wave 2 plan: task surfaces

Seven tasks that make the task screens usable: one task view for the panel and the full page, editable properties, row clicks, a calendar that shows every task, My tasks on the shared table, subtasks, and a phone layout. Each task owns its files, so the tasks in one group can run in parallel without touching the same file. The wave's scope and acceptance are in [the roadmap](../roadmap.md#2-task-surfaces); findings are in [the UX backlog](../backlog/ux.md) and [the code-health backlog](../backlog/code-health.md).

## Order

| Group | Tasks                            | Starts when                    |
| ----- | -------------------------------- | ------------------------------ |
| A     | W2-1, W2-3, W2-4, W2-5           | now, in parallel               |
| B     | W2-2                             | W2-1 is committed              |
| C     | W2-6 after W2-2; W2-7 after W2-3 | their predecessor is committed |

## Every task

- Follow `AGENTS.md` and load the `verify-change` skill; UI tasks also load `ui-from-reference`.
- User-facing copy goes through `apps/web/src/i18n/`; `packages/ui` components take copy as props.
- Record the gates in the commit body under `Verified:`, including screenshots checked at 1440px and 390px.
- Delete each closed finding from its backlog in the same commit.

## W2-1: One task view for the panel and the full page

Closes UX 2 and code-health UI-03, UI-04, UI-19, WEB-30.

- Owns: `packages/ui/src/composites/TaskSheet/*`, `apps/web/src/app/(app)/tasks/[id]/page.tsx`, `apps/web/src/app/(app)/@modal/(.)tasks/[id]/page.tsx`, `apps/web/src/app/(app)/tasks/[id]/TaskDetailDrawer.tsx`, `apps/web/src/app/(app)/tasks/[id]/TaskAssigneeForm.tsx` (deleted).
- Steps: split the task content from its container, so the panel renders it inside `Sheet` and the page renders it under a page header with a breadcrumb; remove the `renderAsPage` flag, the Close button on the page, and `TaskAssigneeForm` with its native multi-select.
- Gates: the geometry check in `tests/e2e/customer/route-health.spec.ts` (task page content does not intersect the app header, no Close button) passes; `/tasks/<id>` deep-linked and opened from `/tasks` both render the same fields; `TaskSheet.tsx` is under 120 lines.

## W2-2: Editable task properties and activity

Closes UX 1 and code-health UI-01, UI-02, UI-24. Depends on W2-1.

- Owns: `packages/ui/src/composites/TaskSheet/*` (new `TaskProperties.tsx`), `apps/web/src/app/(app)/tasks/[id]/TaskDetailDrawer.tsx`, `apps/web/src/i18n/work-copy.ts`.
- Steps: add stage, priority, assignees, start and due dates and parent as controls that save on change through the `updateTask`, `moveTask` and `setTaskDates` server actions, each showing `error.fields` inline; mount `ActivityFeed` under them; move TaskSheet copy into `work-copy.ts`; replace the inlined terminal-stage list with `isTerminalStage` from `KanbanBoard/board-state.ts`; make both save callbacks required.
- Gates: each property change persists and shows on `GET /api/v1/tasks/<id>`; a stale edit shows the conflict message; invalid dates show the field error; a staff user without update access sees read-only properties.

## W2-3: Open a task from anywhere in its row

Closes UX 9.

- Owns: `packages/ui/src/composites/DataTable/*`.
- Steps: add an optional `onRowClick` (or row `href`) to `DataTable` that ignores clicks on links, buttons, inputs and the selection checkbox, and supports Enter on a focused row; pass it from the task list.
- Gates: clicking a cell opens the task; clicking a link inside a row follows the link; keyboard Enter on a row opens the task; axe reports no new violations on `/tasks`.

## W2-4: A calendar that shows every task

Closes UX 4 and code-health UI-08, UI-10, UI-11, UI-16.

- Owns: `packages/ui/src/composites/CalendarMonth/*`, `packages/ui/src/composites/ActivityFeed/*`, new `packages/ui/src/lib/dates.ts`, `apps/web/src/app/(app)/calendar/page.tsx`.
- Steps: replace the fixed four-event cap with a "+N more" control that opens the full day; take navigation labels from the caller instead of English defaults; format dates through one `Intl.DateTimeFormat` helper in `lib/dates.ts`, used by both composites; make `ActivityFeed` use its `locale` prop; name the overflow threshold.
- Gates: a day with ten tasks shows all ten through "+N more"; dates render in the tenant locale; month navigation still works.

## W2-5: My tasks on the shared task table

Closes UX 27.

- Owns: `apps/web/src/app/(app)/my-tasks/page.tsx` and its query under `apps/web/src/server/queries/work/`.
- Steps: render the actor's buckets (overdue, today, upcoming) with the same row cells as `/tasks`: stage pill, priority, due date, and a complete control that calls `completeTask`.
- Gates: completing a task from My tasks moves it out of the open buckets after refresh; a staff user sees only their assigned tasks.

## W2-6: Subtasks that open and can be added

Closes UX 28. Depends on W2-2.

- Owns: `packages/ui/src/composites/TaskSheet/*`, `apps/web/src/app/(app)/tasks/[id]/TaskDetailDrawer.tsx`.
- Steps: make each subtask row a link to its task; add an "Add subtask" input that calls `createTask` with `parentTaskId`, surfacing the two-level depth limit as a field error.
- Gates: a subtask created from the panel appears under its parent and on `GET /api/v1/tasks/<id>`; a third level is refused with the depth message.

## W2-7: The task list on phones

Closes UX 29 and code-health WEB-29. Depends on W2-3.

- Owns: `packages/ui/src/composites/DataTable/*`, `apps/web/src/app/(app)/tasks/page.tsx`.
- Steps: below the `md` breakpoint, render each row as a card with title, stage pill, due date and assignee initials, reusing the row click from W2-3; remove the stale time zone comment in `tasks/page.tsx`.
- Gates: at 390px the list has no horizontal scroll and every card opens its task; desktop rendering is unchanged.
