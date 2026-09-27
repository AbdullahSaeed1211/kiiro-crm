# Wave 5 plan: CRM records

Five task groups that give leads, deals and tasks the generic record machinery, move domain rules into the CRM module, and build configurable client onboarding. The wave's scope is in [the roadmap](../roadmap.md#5-crm-records); findings are in [the code-health backlog](../backlog/code-health.md) and [the UX backlog](../backlog/ux.md).

## Order

| Group | Tasks                  | Starts when                                                               |
| ----- | ---------------------- | ------------------------------------------------------------------------- |
| A     | W5-1                   | now, alone: it moves domain rules to the CRM module before lists reuse it |
| B     | W5-2, W5-3, W5-4, W5-5 | W5-1 is committed, in parallel                                            |
| C     | W5-6, W5-7             | W5-2 is committed                                                         |
| D     | W5-8                   | W5-7 is committed                                                         |

## Every task

- Follow `AGENTS.md` and load the `verify-change` skill; W5-2 and W5-4 also load `add-use-case` and `ui-from-reference`.
- Keep behavior unchanged unless the task says otherwise; a delegated refactor is diffed against `HEAD` for removed checks and messages before it is committed.
- Delete each closed finding from the backlog in the same commit.

## W5-1: Move domain rules into the CRM module

Closes WEB-10, WEB-14, WEB-16, WEB-17, DOM-02.

- Owns: `packages/modules/crm/src/domain/helpers.ts`, `packages/modules/crm/src/commands/crud.ts`; `packages/modules/crm/src/ports/repository.ts` (add methods); `apps/web/src/server/crm/leads/actions.ts`, `apps/web/src/server/crm/leads/types.ts`, `apps/web/src/server/crm/leads/queries.ts`.
- Steps: extract lead-move legality, display names, saved-view parsing and currency defaults into module use cases and ports; remove the duplicate `isTerminalStage` logic and move it to a shared stage module; make the Payload adapter implement the new port methods; update the leads actions and queries to call the module instead of inline rules.
- Gates: `members.ts` contains no direct lead-move or display-name logic; `/api/v1/leads` and `/api/v1/leads/:id/move` endpoints work with the same rules as the web routes; every refactored lead workflow test passes.

## W5-2: Generic record lists

Closes WEB-03, WEB-04, WEB-05, WEB-08, DOM-05, DOM-06, UX 6, UX 7.

- Owns: `packages/ui/src/composites/DataTable/` (extend for all record types); `apps/web/src/app/(app)/directory-list-view.tsx` (generalize); `apps/web/src/server/crm/directory/data.ts` (extend for leads, deals); new `apps/web/src/server/crm/leads/data.ts`, new `apps/web/src/server/crm/deals/data.ts`.
- Steps: parameterize the directory list to work for leads, deals and tasks; move sort/filter/column logic into a shared `list-page` module; keep the stage color map, empty state and pagination helpers in one place; extend `DataTable` with inline-edit support.
- Gates: leads, deals and tasks all use the shared list layout; saved-view sort persists after reload; the `/leads`, `/deals` and `/tasks` pages render the same column configuration and stage colors; every list test passes.

## W5-3: Stage requirements

Closes UX 14, UX 17.

- Owns: new `packages/modules/crm/src/domain/stage-requirements.ts`; `apps/web/src/app/(app)/settings/workflows/` (add requirements UI); `packages/modules/crm/src/commands/crud.ts` (enforce on stage move).
- Steps: add a per-stage required-fields list to the workflow configuration; render the requirements editor in settings; on stage move, check that all required fields are populated, and return a named error listing the missing fields if not.
- Gates: a deal with missing required-field values returns a 400 error from `/api/v1/deals/:id/move` naming each missing field; the workflow editor shows the field list for each stage; a move to a stage with no requirements succeeds as before.

## W5-4: One lost dialog and one activity feed

Closes WEB-06, WEB-07, WEB-03 (deal and lead variant).

- Owns: `packages/ui/src/composites/LostReasonDialog/` (generalize); `packages/ui/src/composites/ActivityFeed/` (shared); `apps/web/src/app/(app)/deals/[id]/page.tsx`, `apps/web/src/app/(app)/leads/[id]/page.tsx`.
- Steps: extract a generic `LostReasonDialog<TResult>` parameterized by reasons and an onSubmit callback; replace deal and lead variants with the shared control; use the shared `ActivityFeed` on all record detail pages; unify the activity-item shapes.
- Gates: deal and lead pages render identical lost/mark-won controls and activity feeds; a lost reason is required on both; the dialog works with keyboard and touch; the activity feed groups and orders entries consistently.

## W5-5: Inline edit for every record field

Closes UX 6 (partial).

- Owns: new `packages/ui/src/composites/PropertyField/` (generalize edit control); `apps/web/src/server/crm/directory/data.ts` (record detail query).
- Steps: build a generic field-edit component that saves on blur or Enter; reuse it for title, custom fields and standard fields (deal value, expected close, etc.); share one optimistic-update hook across all records.
- Gates: clicking any editable field on a record detail page opens an inline editor; saving shows pending and success states; reload preserves the value; a conflict (optimistic concurrency) refreshes the page and shows the new value; keyboard and touch both work.

## W5-6: Configurable custom fields

Closes part of wave 5 onboarding scope.

- Owns: `packages/modules/crm/src/schema.ts` (add custom-field schema); new `apps/web/src/app/(app)/settings/fields/` (custom-field editor); `apps/web/src/server/crm/directory/actions.ts` (save custom fields).
- Steps: extend the CRM record schema to support tenant-configured custom fields (text, select, date, checkbox); render a custom-field editor in settings; on record detail, show and edit custom fields using the shared inline-edit control.
- Gates: custom fields appear in the workflow editor and on record pages; a tenant-configured field persists after reload; changing a field type from select to text removes previous option values on reload.

## W5-7: Onboarding playbooks

Closes part of wave 5 onboarding scope.

- Owns: new `packages/modules/crm/src/domain/onboarding.ts`; `apps/web/src/app/(app)/settings/playbooks/` (playbook editor); `packages/modules/crm/src/commands/crud.ts` (on deal won, create project from playbook).
- Steps: add a playbook list to the workflow/settings; each playbook is a task list that can be created from a template; when a deal is marked won, automatically create a project and populate its tasks from the configured playbook if one is selected.
- Gates: a playbook appears in the workflow settings; marking a deal won creates a project with the playbook's task names and custom fields; creating a second won deal in the same workflow uses the same playbook; playbook changes do not affect previous projects.

## W5-8: Intake form mapping

Closes part of wave 5 onboarding scope. Depends on wave 3 for the composition root.

- Owns: `packages/modules/intake/src/commands/submit.ts` (add field mapping); `apps/web/src/app/(app)/settings/intake/` (mapping UI); `apps/web/src/server/actions/settings/intake.ts` (mapping actions).
- Steps: in the intake settings, let tenants map form questions to record fields (e.g. "Phone" → lead phone field); on form submission, write answers to the mapped fields automatically; if a mapped field requires a stage move, apply it.
- Gates: an intake form submission creates a lead with mapped values; editing the mapping does not change previously-submitted leads; unmapped fields are written to a notes field instead.
