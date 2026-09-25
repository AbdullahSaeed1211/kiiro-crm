---
name: add-record-surface
description: Use when adding a new list, board, or detail page for a record type (leads, deals, tasks, contacts, organizations, or a new entity) in apps/web.
---

# Add a record surface (list / board / detail page)

`packages/ui` is presentational only — no data fetching, no server calls. Pages in
`apps/web/src/app/(app)/**` fetch data via `apps/web/src/server/**` and compose it
with shared composites from `packages/ui/src/composites/`. Don't hand-roll what a
composite already does.

## Steps

1. Add/extend the data loader in `apps/web/src/server/<module>/**` (e.g.
   `apps/web/src/server/crm/directory/data.ts`) — server-only, returns plain data for
   the page, no JSX.
2. Build the list/table with `packages/ui/src/composites/DataTable` (`DataTable.tsx`,
   165 lines) — pass a `toolbarStart` slot for filters/search instead of adding a
   custom toolbar next to it.
3. Build a board with `packages/ui/src/composites/KanbanBoard` — use
   `board-state.ts` (94 lines) for optimistic move + rollback instead of writing
   local drag state; see `apps/web/src/server/actions/work/tasks/moveTask.ts` for the
   action it calls into.
4. Build a detail/record page with `packages/ui/src/composites/RecordPageLayout`
   (162 lines) for the header/sidebar shell, `packages/ui/src/composites/ActivityFeed`
   (77 lines) for activity/timeline, `packages/ui/src/composites/StageSelect` (99
   lines) for any stage picker, `packages/ui/src/composites/EmptyState` (38 lines) for
   empty/zero states.
5. Route all UI copy through the i18n copy objects in `apps/web/src/i18n/` (e.g.
   `work-copy.ts`, `inbox-copy.ts`) — don't inline user-facing strings in the page.
6. Wire the page under `apps/web/src/app/(app)/**`, following the existing
   directory/list-view split.

## Golden examples

- Generic list + board reference: `apps/web/src/app/(app)/directory-view.tsx` and
  `apps/web/src/app/(app)/directory-list-view.tsx` with data from
  `apps/web/src/server/crm/directory/data.ts`.
- DataTable's slot API: `packages/ui/src/composites/DataTable/DataTable.tsx` line 34
  (`toolbarStart?: ReactNode`) and line 141 (render site).
- KanbanBoard optimistic state: `packages/ui/src/composites/KanbanBoard/board-state.ts`.

## Rules / pitfalls

- Don't duplicate composites per entity. Known duplication to avoid repeating: a
  separate deal lost dialog (`apps/web/src/app/(app)/deals/DealLostDialog.tsx`)
  alongside the lead one (`apps/web/src/app/(app)/leads/LostReasonDialog.tsx`,
  `LeadDialogs.tsx`) — if you're adding a "mark lost" flow for a third entity, extract
  a shared dialog instead of copying one of these.
- Don't hand-roll native `<select>` for a stage picker — `DealControls.tsx` and
  `DealClosingControls.tsx` under `apps/web/src/app/(app)/deals/` use raw `<select>`
  where `@ops/ui`'s `StageSelect` should be used; don't add a fourth copy.
- `initials()` is currently duplicated across at least four files (
  `apps/web/src/app/(app)/directory-list-view.tsx`,
  `apps/web/src/app/(app)/tasks/page.tsx`,
  `apps/web/src/app/(app)/inbox/inbox-model.ts`,
  `apps/web/src/server/crm/leads/types.ts` line 40) — don't add a fifth; import one of
  these or, if genuinely new, put it in `packages/ui`.
- Never fetch data inside a `packages/ui` component — pass it in as props.
- Never add a raw `<input type="date">` where `@ops/ui` has a date/calendar
  component (see `packages/ui/src/composites/CalendarMonth`).

## Done when

- `pnpm typecheck && pnpm lint` pass, and `pnpm depcruise` shows no new
  `packages/ui` → data-fetching violation.
- The page renders through a composite (DataTable/KanbanBoard/RecordPageLayout), not
  a bespoke table/board.
- No new native `<select>`/`<input type="date">` where an `@ops/ui` equivalent exists.
- `pnpm verify:fast` passes.
