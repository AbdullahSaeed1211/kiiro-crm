# Code-health backlog

84 findings are open: 12 high, 36 medium and 36 low severity. They come from a DRY, SOLID, Clean Code and Clean Architecture review of the whole repository at commit `cc6b2d6`; 18 findings from that review are already fixed and are not listed. Line numbers were recorded at that commit, so confirm each location before editing.

## How to use this backlog

- Fix a whole root cause where you can: one shared change closes every finding in its group.
- Delete a finding from this file in the commit that fixes it. When a fix is partial, replace its status line with what remains.
- Keep each fix behavior-preserving unless the finding says otherwise, and verify it as described in [AGENTS.md](../../AGENTS.md#verifying-a-change).

## Root causes

| Root cause                                                                                                                         | Severity | Open findings                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| Two maturity levels: identity, settings, comments and auth call Payload directly, with no use case, transaction or activity record | High     | ARCH-01 ARCH-02 ARCH-04 ARCH-05 ARCH-06                                             |
| Errors are handled several ways: adapters throw while modules return `Result`, and client `catch` blocks discard the cause         | High     | DOM-09 WEB-22 WEB-23 WEB-24 SCR-09                                                  |
| Large files carry permanent `max-lines` and `complexity` waivers instead of being split                                            | High     | DOM-07 DOM-08 DOM-16 WEB-13 WEB-14 SCR-14                                           |
| Each record type copies the list, board, lost dialog, activity card, stage picker and conflict handling                            | High     | WEB-03 WEB-04 WEB-05 WEB-06 WEB-07 WEB-08 WEB-09 WEB-27 WEB-31 DOM-05 DOM-06 DOM-14 |
| Domain rules live in the web layer: lead move legality, display names, saved-view parsing, currency defaults                       | High     | WEB-10 WEB-14 WEB-16 WEB-17 DOM-02                                                  |
| One concept, several implementations: time zone list, theme tokens, date formatting                                                | Medium   | UI-10 UI-13                                                                         |
| Record-type lists are synced by hand across maps and if-chains                                                                     | Medium   | DOM-03 DOM-04 DOM-18 WEB-18 WEB-28 SCR-07 SCR-20                                    |
| UI composites break their own rules: inline English copy, unused row selection, ignored locale props                               | Medium   | UI-01 UI-02 UI-03 UI-04 UI-06 UI-07 UI-08 UI-11 UI-19 UI-24                         |
| Provisioning state has no owner: a nine-field optional dependency bag and `process.cwd()` read deep in helpers                     | Medium   | SCR-06 SCR-08 SCR-13 SCR-16 SCR-19                                                  |

## Refactor order

Each step keeps `pnpm verify` green and makes the next one safer.

1. Settle on one error model. Adapters return `Result`, and client `catch` blocks report through one helper instead of retyping generic copy (DOM-09, WEB-22 to WEB-24).
2. Add a composition root and an identity module. Replace the `get*Deps` files with one `server/container.ts`, and move invite, resend and revoke into `packages/modules/identity` with an in-memory double (ARCH-01, ARCH-04, ARCH-06).
3. Move web-layer rules into the modules: lead move legality, display names, saved-view parsing and currency defaults (WEB-10, WEB-14, WEB-16, WEB-17).
4. Build generic record machinery. Extend the contacts and organizations `directory-view` approach to leads, deals and tasks: shared lists, boards, lost dialog, activity feed and conflict handling. This also closes most of the [UX backlog](ux.md).
5. Split the oversized files: `mail-store`, `job-store`, `intake-forms`, `member-forms` and `TaskSheet` (DOM-07, DOM-08, WEB-11, UI-04).
6. Shrink `PAYLOAD_IN_ROUTES_DEBT` in `tooling/depcruise/.dependency-cruiser.cjs` to empty by moving each route behind a `server/` query or action (ARCH-02).

## Patterns to copy

- `packages/platform/src/workflows/change-stage.ts`: a port-based use case with a transaction and an activity record. Every other write should work this way.
- `apps/web/src/app/(app)/directory-view.tsx` with `apps/web/src/server/crm/directory/data.ts`: the template for generic record machinery.
- `packages/adapters/payload/src/repositories/local-api.ts` compare-and-set helpers, the table-driven `record-codecs.ts`, and the declarative `access/rules.ts`.
- `packages/ui/src/composites/KanbanBoard/board-state.ts`: an optimistic-update state machine with rollback.

## Architecture

### ARCH-01: Missing use-case layer (inconsistent), high severity

- Location: `apps/web/src/server/actions/settings/members.ts:35-92`
- Evidence: `inviteMember`/`revokeInvitation` call `payload.find({ collection: 'users'/'invitations', where: {...} })` directly with no module/port indirection, unlike CRM/work commands
- Consequence: Membership rules (duplicate-email check, pending-invite check, token expiry) are untestable without Payload/D1, undocumented as a domain concept, and diverge in style/rigor (lint gates disabled) from the rest of the app
- Fix: Extract a `packages/modules/identity` (or fold into `platform`) with `InvitationStore`/`MemberRepository` ports and an `inviteMember` use case; adapter implements ports in `adapters/payload`
- Effort: M

### ARCH-02: Boundary leak / Dependency Rule (conceptual), high severity

- Location: `apps/web/src/app/(app)/settings/{workflows,groups,intake,fields,notifications}/page.tsx`, `apps/web/src/app/api/v1/comments/**` (28 files total call `getPayload`/`payload.find` etc. under `apps/web/src/app`)
- Evidence: grep of `apps/web/src/app` shows 10 files with direct `getPayload`/`payload.*` calls beyond settings/members alone
- Consequence: Composition root's presentation layer (pages/routes) directly plays gateway role; no consistent controller→use-case→gateway pipeline, so authorization/validation for these flows lives ad hoc per page/route instead of one place
- Fix: Route these through `server/queries`/`server/actions` + module commands the way `leads`/`deals`/`tasks` already do
- Effort: M
- Status: partly fixed. `routes-no-payload` in dependency-cruiser blocks new cases; the files in `PAYLOAD_IN_ROUTES_DEBT` still call Payload.

### ARCH-03: No explicit application/use-case package, medium severity

- Location: `packages/modules/crm/src/commands/*.ts`, `packages/modules/work/src/commands/*.ts`
- Evidence: Use cases exist as flat functions in a `commands/` folder mixed with schema/domain helpers in the same package, not a separate `application` layer with named interactors
- Consequence: Fine at current size (crm 1,319 LOC) but as modules grow, no seam exists to keep entities (invariant-only) separate from orchestration (transactions, access checks, events) - `conversion.ts` already mixes both
- Fix: Split each module into `domain/` (pure entities/invariants) and `application/` (commands/use cases) subfolders; enforce via boundaries config
- Effort: M

### ARCH-04: Transactions/authorization/events not centralized, medium severity

- Location: `packages/platform/src/workflows/change-stage.ts:78-89` vs `apps/web/src/server/actions/settings/members.ts:35-70`
- Evidence: `changeStage` always wraps writes in `deps.uow.run(...)` and writes an activity entry (`:55-69`); `inviteMember` has no `UnitOfWork`, no activity/event, just sequential `payload.create` calls guarded by try/catch
- Consequence: Two invitation writes (create invitation + later revoke/consume) are not transactional or auditable the way stage changes are; inconsistent event-sourcing/activity trail across the app
- Fix: Route membership use cases through the same `UnitOfWork`/activity-port pattern platform already defines
- Effort: M

### ARCH-05: Screaming architecture (partial), low severity

- Location: `apps/web/src/app/(app)/**` route names (`leads`, `deals`, `tasks`, `projects`) vs `apps/web/src/server/actions/settings/**`
- Evidence: Route folders scream CRM/work domain; but `server/actions` mixes true domain actions (`work/tasks/*`) with framework-shaped ad hoc handlers (`settings/members.ts`) under one flat "actions" bucket rather than by bounded context
- Consequence: Harder to see at a glance which server actions are backed by a tested module use case vs. inline Payload code
- Fix: Reorganize `server/actions` by bounded context (`actions/identity`, `actions/crm`, `actions/work`) mirroring `packages/modules/*`
- Effort: S

### ARCH-06: Testability gap, low severity

- Location: `packages/modules/crm/test/memory-crm.ts` exists; no equivalent in-memory fake found for identity/invitations
- Evidence: CRM/work modules are provably runnable without Payload (in-memory repo test double); invite/provision logic (ARCH-01) has no module boundary, so it cannot be unit-tested without Payload
- Consequence: Invitation and provisioning logic cannot be unit-tested without Payload.
- Fix: Once ARCH-01 is done, add an in-memory identity fake that mirrors `memory-crm.ts`.
- Effort: S

### ARCH-07: Operator/provisioning use case incomplete, low severity

- Location: `apps/web/src/server/operator/provision.ts:3-17`
- Evidence: `previewTenantPlan` only returns a static plan list + hash; no D1/R2/Cloudflare Worker calls in this function
- Consequence: "Provision tenant" use case named in the audit brief does not exist as a traceable runtime call chain yet - unverified whether it's implemented via `scripts/` outside apps/web
- Fix: Confirm intended location (module vs. ops script) and, if a runtime use case is planned, give it the same ports/module treatment as CRM/work
- Effort: S

## Domain modules and adapters

### DOM-02: DIP/ISP, medium severity

- Location: `packages/modules/crm/src/domain/helpers.ts:192-246` (`findExistingDeal`, `dealCustomData`)
- Evidence: Casts `deps.repo` to `CrmDeps['repo'] & { findDealBySourceLead?; listFieldDefinitions?; getFieldDefinitions?; fieldDefinitions? }` and duck-types through three different possible shapes at runtime with `!== undefined` checks.
- Consequence: The declared `CrmRepository` port (`packages/modules/crm/src/ports/repository.ts`) has none of these members, so this is domain code silently depending on undeclared, adapter-specific extensions. A conforming `CrmRepository` implementation (e.g. a test double) gets the slow `list('deal')`/no-filter fallback without ever being told the fast path exists, and three different naming conventions for "give me field definitions" is unmaintainable.
- Fix: Add `findDealBySourceLead` and one `listFieldDefinitions` method to the `CrmRepository` port itself (real capabilities, not optional duck-typed extras); implement fallback in the adapter, not in domain code.
- Effort: M

### DOM-03: OCP, medium severity

- Location: `packages/adapters/payload/src/repositories/mail-store.ts:11-18,108-111,150-169`
- Evidence: `RECORD_COLLECTIONS` maps 6 record types to collections; `senderMatchesRecord` then if/else-chains on `record.type` (`deals` gets special contact traversal, `organizations/contacts/leads` get direct email, everything else `false`). Adding a 7th mailable record type requires editing the map _and_ this if-chain _and_ `findRecordByAddressToken`'s full-table scan list.
- Consequence: New record type support requires 3 coordinated edits in one file to stay consistent; miss one and sender verification silently returns `false` for the new type (fails closed, but silently).
- Fix: Replace the type check with a small per-record-type strategy table (`{ [type]: (doc) => Promise<boolean> }`) built once, so adding a type is one table entry.
- Effort: M

### DOM-05: DRY, medium severity

- Location: `packages/adapters/payload/src/repositories/task-repository.ts:175-256` (`taskPage`, `listTaskPage`) vs `packages/adapters/payload/src/repositories/crm/crm-repository.ts:100-123` (`listCrmPage`)
- Evidence: Both hand-roll the identical `payload.find({..., depth:0, overrideAccess:false, user:req.user, req})` pagination wrapper and total-count mapping; `listTaskPage` additionally reimplements a due-date-nulls-last two-bucket pagination algorithm found nowhere else.
- Consequence: Any change to how scoped pagination is done (e.g. adding cache, depth, or error handling) must be replicated by hand in at least two files; the nulls-last algorithm in particular is intricate (dual counts, offset math) and untested duplication risk is high if a third list needs the same "nulls last" ordering.
- Fix: Extract a shared `scopedPage(req, { collection, where, sort, page, limit })` helper in `local-api.ts`; keep the nulls-last logic as one general-purpose utility parameterized by field.
- Effort: M

### DOM-07: SRP, medium severity

- Location: `packages/adapters/payload/src/repositories/mail-store.ts` (296 lines, `/* eslint-disable complexity, max-lines, max-lines-per-function */`)
- Evidence: One file: message CRUD, address-token scanning across 6 collections, sender verification (with per-type logic), activity dedup, notification fan-out, quarantine release.
- Consequence: The lint-disable at the top is itself evidence the file exceeds the project's own complexity budget; six responsibilities in one module make it hard to unit test any one concern (e.g. sender verification) without standing up the whole `MailStore`.
- Fix: Split into `mail-store.ts` (message CRUD), `mail-sender-verification.ts`, and `mail-notify.ts`, composed in `createMailStore`.
- Effort: M

### DOM-08: SRP, medium severity

- Location: `packages/adapters/payload/src/repositories/job-store.ts` (343 lines, `/* eslint-disable max-lines, max-params */`)
- Evidence: Single file implements cursor encoding, job claim/idempotency, terminal-stage computation, and 5 distinct target-listing queries (invitations, overdue, digests, stalled, rejected-purge).
- Consequence: Mixes "generic cursor pagination machinery" with "business rule: which records count as stale/overdue" - a new job type requires understanding the whole file, and the cursor logic can't be reused/tested independently of Payload.
- Fix: Extract `cursor.ts` (pure `withCursor`/`isAfterCursor`/`afterCursor`) from the Payload-specific query builders.
- Effort: S

### DOM-09: Clean code error handling, medium severity

- Location: `packages/adapters/payload/src/repositories/task-repository.ts:265,270,301,326` and `crm-repository.ts:67,85`
- Evidence: `createTask`/`createProject`/`loadTaskWorkflow`/`loadDefaultWorkflow` `throw new Error(...)` while every module command (`crud.ts`, `pipeline.ts`, `submit.ts`) returns `Result`/`ok`/`err`. `executeCommand` in `domain/helpers.ts` catches exceptions and converts them to `INTERNAL` errors, but only for CRM; work module command handlers (`commands/tasks.ts`, `projects.ts`) were not inspected here to confirm they wrap similarly - unverified whether an uncaught throw from `loadTaskWorkflow` surfaces as a clean domain error or an unhandled rejection in the work module.
- Consequence: Mixing throw-based and Result-based error styles inside the same layer (adapters called by domain code) makes error handling non-uniform; a caller that forgets a try/catch turns a configuration error ("no workflow configured") into a 500 instead of a typed domain error.
- Fix: Standardize: adapters return `Result` (or a narrower "not configured" sentinel) instead of throwing, matching the `StageStore`/`CrmRepository` pattern used elsewhere (`saveStage` already returns `undefined` instead of throwing).
- Effort: S

### DOM-04: OCP, low severity

- Location: `packages/adapters/payload/src/repositories/job-store.ts:198-202` (`recordTargets`)
- Evidence: Hardcoded 3-collection array `[[COLLECTIONS.leads, RECORD_TYPES.leads], [COLLECTIONS.deals, ...], [COLLECTIONS.projects, ...]]` duplicated in spirit from `mail-store.ts`'s `RECORD_COLLECTIONS`.
- Consequence: Two independent "which record types matter for staleness/mail" lists that must be kept in sync by hand; a new stage-tracked record type needs edits in both files plus `contracts/names.ts`.
- Fix: Derive both lists from one shared "stage-tracked record types" constant in `contracts/names.ts`.
- Effort: S

### DOM-06: DRY, low severity

- Location: `packages/adapters/payload/src/repositories/crm/crm-repository.ts:42-47` (`updateRecord`) vs `packages/adapters/payload/src/repositories/task-repository.ts:156-169` (`updateTaskAndMap`)
- Evidence: Nearly identical "call `updateIfUnchanged`, map doc back to domain record, return undefined on conflict" bodies, one per repository.
- Consequence: Same CAS-update-then-map pattern re-typed per aggregate instead of being a single generic helper (`local-api.ts` already generalizes the read/write primitives but not this composition).
- Fix: Add a generic `updateAndMap(req, update, mapper)` to `local-api.ts`.
- Effort: S

### DOM-10: Clean code side effects, low severity

- Location: `packages/adapters/payload/src/repositories/mail-store.ts:121-142` (`findRecordByAddressToken`)
- Evidence: Comment: "this bounded adapter scan is the verification boundary for HMAC addresses" - function does a full unbounded `find` (`limit: 0, pagination: false`) across all 6 record collections and recomputes an HMAC address per document to find one match.
- Consequence: Named like a lookup but is actually an O(n) full-table scan with per-row crypto; the function signature gives no hint of this cost, and "bounded" in the comment is misleading since `limit: 0` is literally unbounded.
- Fix: Rename to `scanRecordsForAddressToken` and/or fix comment; longer term, store the token derivable without a full scan (e.g. index it).
- Effort: S

### DOM-11: Clean code magic values, low severity

- Location: `packages/adapters/payload/src/repositories/task-repository.ts:118`
- Evidence: `rank: draft.rank ?? '000000000001'` - a 12-digit zero-padded string magic default embedded inline in `taskData`.
- Consequence: Unexplained fixed-width rank string with no named constant or comment on why 12 digits / this value; a rank-collision bug would be hard to trace back here.
- Fix: Extract `const DEFAULT_TASK_RANK = '000000000001'` near `packages/modules/work/src/domain/rank.ts` (which already owns ranking logic) so the constant lives with its domain rules instead of the Payload adapter.
- Effort: S

### DOM-12: Clean code naming, low severity

- Location: `packages/adapters/cloudflare/src/cron/job-support.ts:82-86` (`asBatch`) vs `packages/adapters/cloudflare/src/cron/jobs.ts:36-52` (`JobSources` methods)
- Evidence: `JobSources` methods are all declared optional (`listOverdue?`, `deleteRejected?`, etc.) and called with `?.()`, silently no-op'ing (`ok({processed:0...})`) when unset, rather than the type system requiring every job source to be wired.
- Consequence: A composition root that forgets to wire one job source doesn't fail to compile or fail loudly - the job just silently "succeeds" processing 0 rows forever. Combined with ISP (each job only needs one method), fine, but the optionality removes a safety net the interface segregation would otherwise have kept.
- Fix: Keep the ISP split (each job takes its single-method port) but make that single method required, not optional, on the split-out interface.
- Effort: S

### DOM-14: DRY, low severity

- Location: `packages/adapters/payload/src/repositories/task-repository.ts:44-61` (`workflowFor`, `mapProject`, `mapTask`)
- Evidence: `mapProject` and `mapTask` are structurally identical (load workflow, find stage by `stageId`, call a `to*Record` mapper) differing only in which `to*Record` function is called.
- Consequence: Boilerplate duplicated per record kind; adding a third stage-tracked kind repeats the same 4-line pattern again.
- Fix: Factor a generic `mapStageTracked(req, doc, mapper)` helper.
- Effort: S

### DOM-15: SRP, low severity

- Location: `packages/modules/crm/src/domain/helpers.ts` (247 lines)
- Evidence: File mixes generic command scaffolding (`failure`, `parse`, `executeCommand`, `accessDenied`) with pipeline-move business logic (`validatePipelineMove`, `persistPipelineMove`, `finalizeDealMove`, `movePipeline`) and lead-conversion lookups (`findExistingDeal`, `findExistingOrganization`, `dealCustomData`).
- Consequence: Three distinct responsibilities (command infra / stage-move orchestration / conversion helpers) share one "helpers" file, which is a classic SRP smell - hard to find things, and unrelated changes (e.g. tweaking conversion custom-data selection) touch a file that also contains security-sensitive `accessDenied`.
- Fix: Split into `command-support.ts`, `pipeline-move.ts`, `conversion-support.ts`.
- Effort: S

### DOM-16: Clean code comments, low severity

- Location: `packages/adapters/payload/src/repositories/job-store.ts:1` and `mail-store.ts:1`
- Evidence: Both files open with `/* eslint-disable ... - <justification> */` as their first line, effectively documenting "this file is too big/complex" as a permanent waiver rather than fixing it.
- Consequence: Lint-disable-with-justification comments normalize exceeding the project's own size/complexity budgets instead of triggering a split (see DOM-07, DOM-08); new code tends to accrete in these files since the guard rail is already off.
- Fix: Treat repeated `eslint-disable max-lines`/`complexity` on adapter files as a backlog signal to split, not a permanent waiver.
- Effort: S

### DOM-18: OCP, low severity

- Location: `packages/modules/crm/src/commands/crud.ts:20-29,31-40` and `pipeline.ts:78-92`
- Evidence: `organizationPatch`, `contactPatch`, `leadPatch`, `dealPatch` each hand-list which fields need `cleanNullable`/`id`/`ids` normalization; `leadPatch` uses a `normalizeLeadEntry` switch-like if-chain on field name strings (`'assigneeIds'`, `['firstName','lastName',...]`, `['organizationId','sourceId','ownerId']`).
- Consequence: Adding a new nullable/ref field to any CRM record type means finding and editing the matching per-type patch function and remembering to add its key to the right string list; nothing enforces the field lists stay consistent with the schema in `packages/modules/crm/src/schema/index.ts`.
- Fix: Drive patch normalization from the same `Codecs` table already used for encode/decode in `record-codecs.ts` (it already knows which fields are refs/nullable) instead of re-listing field names per patch function.
- Effort: M

## Web app (`apps/web`)

### WEB-03: DRY, high severity

- Location: `apps/web/src/app/(app)/deals/[id]/page.tsx:20-46` vs `apps/web/src/app/(app)/leads/LeadRecordClient.tsx:106` / `record-view-primitives.tsx:35`
- Evidence: Deal record page hand-rolls an `ActivityCard` (verb/actor/time layout) instead of using `ActivityFeed` from `@ops/ui`, which the lead record and generic record view already use
- Consequence: New activity verbs or styling changes must be made twice; deal's activity feed will visibly diverge (no icons, no grouping) from every other record type
- Fix: Replace `ActivityCard` with `<ActivityFeed items={data.activity} />`, mapping `ActivityItem`→`ActivityEntry` the way `LeadRecordClient.tsx` does
- Effort: S

### WEB-08: DRY, high severity

- Location: `apps/web/src/app/(app)/leads/page.tsx:80-114`, `apps/web/src/app/(app)/deals/page.tsx:68-114`, `apps/web/src/app/(app)/tasks/page.tsx:88-217`
- Evidence: Each list page reimplements its own `TABLE_LABELS`, stage pill/dot color maps (`STAGE_PILL`/`STAGE_DOT` copy-pasted verbatim in `deals/page.tsx:34-53` and `tasks/page.tsx:56-76`), `EmptyValue`, and pagination-href builder
- Consequence: Same 8-color map hardcoded 2+ times; changing a stage color token means grepping every list page
- Fix: Move `DataTableLabels` defaults, the stage color map, and a generic `paginationOf(params)` helper into `packages/ui`/a shared `list-page` lib; `directory-view.tsx` already shows the pattern for contacts/orgs - extend it
- Effort: M

### WEB-11: SRP, high severity

- Location: `apps/web/src/app/(app)/settings/intake/intake-forms.tsx` (524 lines), `apps/web/src/app/(app)/settings/member-forms.tsx` (494 lines)
- Evidence: Single files mixing multiple dialogs, list rendering, optimistic state, fetch/catch error handling, and formatting for an entire settings sub-area
- Consequence: Hard to test or modify one form without risk to siblings; violates single-reason-to-change
- Fix: Split into one file per form/dialog plus a shared list component
- Effort: M

### WEB-12: SRP, high severity

- Location: `apps/web/src/app/(app)/deals/[id]/page.tsx`
- Evidence: One file mixes: activity rendering (`ActivityCard`), money/date formatting glue, contact-name joining (`[contact.firstName, contact.lastName].filter(Boolean).join(' ')` duplicated at lines 92 and 121), layout composition, and data fetching orchestration
- Consequence: Any of these four concerns changing forces touching the same file; the name-joining logic is copy-pasted twice in the same file
- Fix: Extract `ActivityCard`→shared feed (WEB-03), move `displayName`-style helpers to view-model, keep the page as pure composition
- Effort: M

### WEB-16: DIP/Layering, high severity

- Location: `apps/web/src/server/crm/leads/actions.ts:40-50`
- Evidence: `validateLeadMoveDestination` fetches the lead and workflow directly and re-derives transition legality in the web layer, ahead of calling `runMoveLead`
- Consequence: Business rule (which stage moves are legal) now has two homes: this pre-check and whatever `runMoveLead` itself enforces in the module - if they disagree, the pre-check's error message can lie about why the real module call fails
- Fix: Push this validation into `runMoveLead` (or a `canMoveLeadTo` module export) and have the action simply call it once
- Effort: M

### WEB-22: Clean code error handling, high severity

- Location: `apps/web/src/app/(app)/settings/member-forms.tsx:43,55,125,219,323,392,405`
- Evidence: Seven bare `catch { setMessage('Unable to ... Try again.') }` blocks - the actual error (network vs validation vs auth) is discarded, and the same generic sentence is retyped seven times
- Consequence: Swallowing errors makes support/debugging impossible ("try again" for a permissions error that will never succeed); the repeated string is a maintenance trap
- Fix: Central `reportActionError(context)` helper that logs + returns a typed message; distinguish retryable vs terminal errors
- Effort: M
- Status: partly fixed. Server actions now log the real error through `actionFailure`; the client-side `catch` blocks still show generic copy without logging.

### WEB-27: DRY, high severity

- Location: 15+ files under `grep expectedUpdatedAt` (`directory-form.tsx`, `TaskBoard.tsx`, `LeadBoard.tsx`, `DealBoard.tsx`, `lead-board-model.ts`, `deal-board-model.ts`, `ConvertDialog.tsx`, etc.)
- Evidence: Optimistic-concurrency handling (`expectedUpdatedAt` passed through, CONFLICT-code detection, refresh-on-conflict) is reimplemented per entity/board rather than behind one mutation hook
- Consequence: This is exactly the kind of cross-cutting concern that should be a single `useVersionedAction`/`useOptimisticMutation` hook; instead every board/dialog re-derives it, and subtly differs (WEB-26)
- Fix: Extract a shared hook wrapping `startTransition` + Result handling + conflict refresh
- Effort: L

### WEB-04: DRY, medium severity

- Location: `apps/web/src/app/(app)/tasks/[id]/TaskAssigneeForm.tsx`
- Evidence: Separate assignee-editing form outside `TaskSheet`, using raw unstyled `<select multiple>`/`<button>` instead of `@ops/ui` components, and its own save/error handling
- Consequence: Editing assignees behaves and looks different depending on which surface you use; a second place to keep permission/optimistic-concurrency logic in sync
- Fix: Fold assignee editing into `TaskSheet`/`TaskDetailDrawer` and delete this component
- Effort: M

### WEB-05: DRY, medium severity

- Location: `apps/web/src/app/(app)/tasks/TaskWorkspaceViews.tsx` vs `apps/web/src/app/(app)/leads/LeadListControls.tsx:57-68` vs `apps/web/src/app/(app)/deals/page.tsx:137-140`
- Evidence: Three separate table/board switcher implementations: a `<nav>` of `Link`s with active-state styling (tasks), two ad hoc `<a>` tags (leads), and a `Button render={<Link/>}` (deals)
- Consequence: Adding a new view (e.g. calendar) to leads/deals means writing bespoke markup again instead of reusing one composite
- Fix: Extract a shared `ViewSwitcher` composite (in `packages/ui`) parameterized by `{id,label,href}[]` and `active`
- Effort: M

### WEB-06: DRY, medium severity

- Location: `apps/web/src/app/(app)/deals/DealControls.tsx:69-83` vs `apps/web/src/app/(app)/leads/LeadRecordClient.tsx:175` (`StageSelect` from `@ops/ui`)
- Evidence: Deal stage editing uses a native `<select>` with manual `useState`; leads use the shared `StageSelect` composite
- Consequence: Deal stage picker won't get accessibility/styling fixes made to `StageSelect`; two code paths to test
- Fix: Replace the native select in `DealControls.tsx` with `StageSelect`
- Effort: S

### WEB-07: DRY, medium severity

- Location: `apps/web/src/app/(app)/leads/LostReasonDialog.tsx` vs `apps/web/src/app/(app)/deals/DealLostDialog.tsx`
- Evidence: Nearly line-for-line duplicate dialogs (reason select, optional note, pending/error state, Cancel/Mark-lost buttons) calling different actions (`markLost` vs `markDealLostAction`) whose Result shapes also differ (`result.error.message` vs `result.message`)
- Consequence: Same UI written and tested twice; the differing Result shapes (WEB-15) leak into these components directly
- Fix: Generic `LostReasonDialog<TResult>` taking `{ reasons, onSubmit }`, entity-specific action passed in; also unify the Result shape first (see WEB-15)
- Effort: M

### WEB-09: DRY, medium severity

- Location: `apps/web/src/server/crm/directory/data.ts:60-82`
- Evidence: `sortOrganizations` and `sortContacts` are identical except which field stands in for "name"
- Consequence: Two comparators that must be changed together whenever sort behaviour changes.
- Fix: One comparator generic over `{ name: string, updatedAt: number }` extraction
- Effort: S

### WEB-13: SRP, medium severity

- Location: `apps/web/src/server/crm/directory/data.ts` (290 lines, `eslint-disable max-lines`)
- Evidence: List loaders, detail loaders, and sort/filter logic for both contacts and organizations in one file, with an explicit lint suppression acknowledging the size
- Consequence: The suppression is a tell that the file already exceeds the team's own limit
- Fix: Split into `organizations.ts` / `contacts.ts` sharing a `sort.ts` (see WEB-09)
- Effort: S

### WEB-14: SRP, medium severity

- Location: `apps/web/src/app/(app)/tasks/page.tsx` (328 lines, `eslint-disable max-lines`)
- Evidence: Single file: cell renderers, column defs, pagination, saved-view JSON decoding (a parsing/validation concern), and the page component itself
- Consequence: Saved-view decoding (untyped JSON→typed sort/mode) is a data-layer concern trapped in a page component, untestable in isolation
- Fix: Move `savedViewSort`/`savedViewMode`/`taskModeOf`/`parseTaskView` to `server/queries/settings/listSavedViews.ts` or a `task-view-params.ts` module; keep page.tsx to layout + fetch
- Effort: M

### WEB-17: DIP/Layering, medium severity

- Location: `apps/web/src/server/crm/leads/types.ts`
- Evidence: File named `types.ts` exports non-type functions with business meaning: `initials`, `stageFor`, `isTerminalStage`, `leadStageMoveError`, `displayName`
- Consequence: Misleading module name (CLEAN-naming) hides domain logic in what looks like a pure type-definitions file - nobody greps `types.ts` for business rules
- Fix: Rename to `lead-view-model.ts` for the display helpers; move `leadStageMoveError`/`isTerminalStage` into `packages/modules/crm`
- Effort: S

### WEB-18: OCP, medium severity

- Location: `apps/web/src/app/(app)/directory-view.tsx`, `directory-list-view.tsx`
- Evidence: `DirectoryListHeader`/tables take a `kind: 'contacts' | 'organizations'` discriminator (per `contacts/page.tsx:16`, `organizations/page.tsx:21`); adding a third directory-style entity means editing this switch and its type union
- Consequence: Directory support doesn't compose - it's closed for extension despite superficially looking like a shared abstraction
- Fix: Parameterize by a config object (columns, empty state, row mapper) per entity instead of a closed string union
- Effort: M

### WEB-20: ISP, medium severity

- Location: `apps/web/src/app/(app)/deals/[id]/page.tsx:100-104`, `DealControls` props (currency, stages, lostReasons, stageCategory, contacts...)
- Evidence: `DealRecordView`/`DealControls` take a wide, loosely-related prop surface (whole `DealDetailData`, plus separately `outboundEmailEnabled`, `currency`) rather than composing from smaller typed slices
- Consequence: Callers must assemble the full `DealDetailData` even for a component that uses 3 of its 10 fields, and adding one field to `DealDetailData` forces re-checking every consumer
- Fix: Narrow each subcomponent's props to just what it renders (e.g., `ControlsCard` shouldn't need the whole `data`)
- Effort: M

### WEB-23: Clean code error handling, medium severity

- Location: `apps/web/src/app/(app)/record-related-tabs.tsx:92-94`, `apps/web/src/app/(app)/workspace-notifications.tsx:89`
- Evidence: More bare `catch {}` swallowing fetch/network errors behind "Unable to reach the server"
- Consequence: Same pattern as WEB-22 at smaller scale - confirms it's systemic, not one file's lapse
- Fix: Same fix as WEB-22
- Effort: S

### WEB-24: Clean code error handling, medium severity

- Location: `apps/web/src/app/(app)/tasks/error.tsx:12`
- Evidence: Route-level error boundary description is the generic "Something went wrong while loading this page." with no distinction from any other route's error boundary
- Consequence: Users/support can't tell which subsystem failed from the message alone
- Fix: Include the route/feature name or the underlying error code in the boundary copy
- Effort: S

### WEB-26: Clean code side effects, medium severity

- Location: `apps/web/src/app/(app)/leads/LostReasonDialog.tsx:117-123`
- Evidence: `submit()` calls `router.refresh()` on the CONFLICT error path but not on other error paths, silently, inside a dialog component whose name suggests pure form state
- Consequence: A reader can't tell from the component's shape that a failed save can trigger a full route refresh; conflict-specific refresh logic is a domain rule (optimistic concurrency) hidden in a leaf UI component
- Fix: Centralize the "on CONFLICT, refresh" policy in whatever shared mutation hook eventually wraps `expectedUpdatedAt` actions (see WEB-27)
- Effort: M

### WEB-30: SRP/hidden I/O, medium severity

- Location: `apps/web/src/app/(app)/tasks/[id]/TaskAssigneeForm.tsx:21-27`
- Evidence: A component named for rendering a form (`TaskAssigneeForm`) also owns network call + optimistic UI state + message formatting with no separation between "form" and "mutation"
- Consequence: Naming promises a dumb form; it is actually a full mutation controller, surprising callers who might reuse it expecting pure presentation
- Fix: Split into presentational `AssigneeSelect` + a `useUpdateTaskAssignees` hook
- Effort: S

### WEB-31: DRY, medium severity

- Location: `apps/web/src/server/crm/deals/queries.ts:47-60` (`loadOwnerNames`) vs `apps/web/src/server/crm/leads/queries.ts:101-118` (`loadLeadPeople`)
- Evidence: Both hand-write a `payload.find({collection:'users', where:{id:{in:ids}}, ...})` + `Map` construction, with slightly different option sets (`pagination:false` vs omitted, `overrideAccess:false` both)
- Consequence: Two near-identical direct Payload queries for "look up users by id" bypass whatever port/repository abstraction is meant to own this; if the users collection or access rule changes, both need updating
- Fix: One `loadPeopleByIds(context, ids)` helper (directory/helpers.ts already has `loadPeople` - reuse it here instead of two more copies)
- Effort: S

### WEB-10: DRY, low severity

- Location: `apps/web/src/app/(app)/leads/page.tsx:37-42` vs `apps/web/src/app/(app)/deals/page.tsx` (uses `formatDate`/`formatMoney` from view-model)
- Evidence: `leads/page.tsx` defines its own local `date()`/`empty()` formatters instead of using the shared `i18n/format` + a shared "em dash for empty" helper
- Consequence: Empty-cell rendering (`-` vs `-`) and date formatting drift entity to entity
- Fix: Shared `<EmptyCell>` / `formatEmpty()` util
- Effort: S

### WEB-21: ISP/Clean code magic values, low severity

- Location: `apps/web/src/app/(app)/record-action-links.tsx:66-85` and 9 other files listing `outboundEmailEnabled`
- Evidence: Boolean capability flag threaded individually through ~9 files (`record-email-thread.tsx`, `record-action-links.tsx`, `contact-record-view.tsx`, `organization-record-view.tsx`, etc.) instead of read once from a capabilities context
- Consequence: Classic boolean-flag-prop smell; every record-view component needs to remember to forward it
- Fix: A `useCapabilities()`/server context read once near the root, consumed where needed, not prop-drilled
- Effort: M

### WEB-28: Clean code magic values, low severity

- Location: `apps/web/src/app/(app)/**` (~15 occurrences)
- Evidence: `recordType: 'deal' | 'lead' | 'contact' | 'organization'` string literals scattered across route files and query modules instead of a shared const/enum
- Consequence: Typo-prone; no compiler help if a route passes `'Deal'` or `'deals'`
- Fix: Shared `RecordType` union + string constants exported from one module (module already likely has this - reuse it)
- Effort: S

### WEB-29: Clean code comments, low severity

- Location: `apps/web/src/app/(app)/tasks/page.tsx:86`
- Evidence: `// Tenant timezone formatting arrives with settings (decision D-39); the spike shows UTC dates.` - a stale "spike" comment describing a known-incomplete implementation, left in production code with no tracking issue link
- Consequence: Comment documents a TODO as prose instead of a linked issue; easy to forget, no lint catches it
- Fix: Replace with `// TODO(D-39): ...` linked to a tracked issue, or resolve it
- Effort: S

## UI package (`packages/ui`)

### UI-01: DIP, high severity

- Location: `TaskSheet.tsx:1,24-99,141,180`
- Evidence: File starts with `/* eslint-disable */`; all copy is inline English literals: `'Unassigned'`, `'Priority: '`, `'Description'`, `'Add a description…'`, `'No subtasks yet.'`, `'Saved.'`, `'This task changed. Refresh and try again.'`, `'Complete'/'Reopen'`. No `labels` prop exists at all, unlike every sibling composite (`KanbanBoard`, `StageSelect`, `GanttView`, `RecordForm`, `ActivityFeed`, `FilterBar`, `ConfirmDialog`, `DataTable`).
- Consequence: Breaks the `es` locale entirely for the task detail view; the blanket eslint-disable likely suppresses the very import/i18n lint rules that would have caught this.
- Fix: Add a `TaskSheetLabels` prop mirroring the pattern used elsewhere; remove the eslint-disable and fix real violations instead.
- Effort: M
- Status: partly fixed. Lint is on again; the English copy is still inline.

### UI-06: Dead code, high severity

- Location: `DataTable/columns.tsx:36-65`, `DataTable/DataTable.tsx:31-32,120,124`, `DataTableFooter.tsx:26,30-34`, `types.ts:40-41,46`
- Evidence: `selectable` prop, `selectColumn`, `row.toggleSelected`, `getSelectedRowIds`, and the `selected`/`selectAll`/`selectRow` label fields exist end-to-end. `grep -rn "selectable" apps/web/src` and `grep "<DataTable" -A15` across all 5 call sites (`directory-list-view.tsx`, `tasks/page.tsx`, `leads/page.tsx`, `deals/page.tsx`) show none pass `selectable`.
- Consequence: ~60 lines of feature code, a TanStack feature (`rowSelectionFeature`), and 2 i18n keys per locale are maintained for a feature no page turns on - inflates the "wide prop interface" surface (see UI-07) for no product value.
- Fix: Either wire selection into a real bulk-action page, or delete `selectable`, `selectColumn`, and the `selectAll`/`selectRow` labels until a caller needs them.
- Effort: S

### UI-02: DRY, medium severity

- Location: `TaskSheet.tsx:134` vs `KanbanBoard/board-state.ts:3,11-13`
- Evidence: `TaskSheet` inlines `['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory ?? '')`; `board-state.ts` already exports `isTerminalStage`/`TERMINAL` doing the same thing for Kanban.
- Consequence: Two sources of truth for "what counts as terminal"; a new terminal category added to one will silently miss the other.
- Fix: Export `TERMINAL`/`isTerminalStage` from a shared stage module (e.g. move into `StagePill/stage.ts`, which `KanbanBoard` already imports from) and reuse in `TaskSheet`.
- Effort: S

### UI-03: OCP, medium severity

- Location: `TaskSheet.tsx:109,120,189-200`
- Evidence: `renderAsPage` boolean prop switches between `<Sheet>` and a bare `<section>` wrapper around the same `detail` JSX; the component owns both the "panel" and "page" layout branches.
- Consequence: Every future rendering context (e.g. modal, drawer) means another boolean flag and another branch in this file.
- Fix: Split the shared `detail` content into a presentational component and let two thin wrappers (`TaskSheetPanel`, `TaskPageSection`) compose it, or accept a `render`/slot prop as `ConfirmDialog` does with `trigger`.
- Effort: M

### UI-04: SRP, medium severity

- Location: `TaskSheet.tsx:103-202`
- Evidence: Single component manages description editing state, save busy-state, completion/reopen busy-state, status messaging, subtask read-only rendering, and page-vs-sheet chrome - five responsibilities in ~100 lines of JSX.
- Consequence: Hard to test description-saving logic independent of layout; any subtask feature growth will keep growing this file.
- Fix: Extract `Description` (already a separate function) and completion handling into a `useTaskSheetActions` hook; keep `TaskSheet` as layout only.
- Effort: M
- Status: partly fixed. Header, footer and message parts are split out; the component still switches between page and sheet with `renderAsPage`.

### UI-05: DRY, medium severity

- Location: `GanttView/gantt-theme.css:8,24-27` vs `StagePill/stage.ts`, `KanbanBoard/stage-dot.ts`
- Evidence: Gantt bars are themed with `--wx-gantt-task-color/-fill-color/-border-color: var(--primary)`, while every other stage-aware surface (StagePill, StageSelect, KanbanBoard, FilterBar) colors by `--stage-*` tokens via `STAGE_DOT`/`stageDotClass`.
- Consequence: Gantt bars can never visually match a task's stage color the way Kanban cards and pills do; the theme file re-derives generic colors instead of consuming the shared stage-color system.
- Fix: Pass the bar's resolved `--stage-*` value through inline style or a `data-stage-color` attribute consumed by `gantt-theme.css`, reusing `stageDotClass`.
- Effort: M

### UI-08: DIP, medium severity

- Location: `CalendarMonth.tsx:70,74` (`labels = { previous: 'Previous month', next: 'Next month' }`), `Collaboration/Pickers.tsx`/`Primitives.tsx:47` (`labels = { trigger: 'Views' }`, `placeholder="Search views"` line ~60)
- Evidence: Several composites take an optional `labels` prop but default it to hardcoded English literals baked into the component, rather than requiring the caller to supply translated strings.
- Consequence: Silently defeats i18n for any page that forgets to pass labels - the failure mode is a wrong-language string in production, not a type error.
- Fix: Make `labels` (and any inline placeholder strings) required, matching the pattern used by `StageSelect`, `KanbanBoard`, `GanttView`.
- Effort: S

### UI-17: Clean code side effects, medium severity

- Location: `theme/ThemeProvider.tsx:12-18,24-29`
- Evidence: `applyTheme` toggles a `theme-switching` class on/off synchronously in the same tick (add then immediately remove, `:15-17`) - its purpose (presumably disabling transitions during the swap) is defeated because no rAF/timeout separates the add from the remove. Separately, `ThemeChoice` includes `'system'`, and `setTheme('system')` clears storage, but the initial-load effect (`:24-29`) only ever resolves to `'dark'` or `'light'` from storage - `prefers-color-scheme` is never read, so "system" always renders as light on load.
- Consequence: The `theme-switching` class can never have any CSS effect as written (classic no-op side effect); "system" theme silently behaves as "light," which is surprising given the exported type promises three real states.
- Fix: Use `requestAnimationFrame`/a `transitionend`-based removal for `theme-switching`; read `window.matchMedia('(prefers-color-scheme: dark)')` when `choice === 'system'`.
- Effort: M

### UI-07: ISP, low severity

- Location: `DataTable.tsx:22-36`
- Evidence: `DataTableProps` mixes pagination, sorting, labels (7 sub-keys), an unused `selectable` flag, and a `toolbarStart` slot; every caller must supply the full `DataTableLabels` including `selectAll`/`selectRow` even when selection is dead (UI-06).
- Consequence: Callers pay a translation and typing tax for a feature they never use.
- Fix: Once UI-06 is resolved, shrink `DataTableLabels` to only the fields actually rendered.
- Effort: S

### UI-10: DRY, low severity

- Location: `ActivityFeed.tsx:26-29` vs `CalendarMonth.tsx:20-22`
- Evidence: Both hand-roll zero-padded UTC date formatting (`String(value).padStart(2,'0')`) instead of using `Intl.DateTimeFormat`, which `CalendarMonth` itself uses two lines later for `monthLabel`/weekday labels, and which `GanttView/model.ts` uses throughout.
- Consequence: Duplicated, locale-insensitive formatting logic (`ActivityFeed`'s timestamp is always `en`-shaped digits regardless of the `locale` prop it accepts but never uses for this string).
- Fix: Route through a shared `formatUtcTimestamp(locale, ms)` helper (or `Intl.DateTimeFormat` with explicit UTC parts) in a common `lib` module.
- Effort: S

### UI-11: DIP, low severity

- Location: `ActivityFeed.tsx:22` (`locale?: string`)
- Evidence: `locale` is declared in `ActivityFeedProps` but never read anywhere in the component body (the timestamp formatter in UI-10 ignores it entirely).
- Consequence: Dead/misleading prop - callers may believe passing `locale` localizes the timestamp; it doesn't.
- Fix: Either use `locale` in the formatter (fixing UI-10 simultaneously) or remove the prop.
- Effort: S

### UI-12: LSP/consistency, low severity

- Location: `RecordForm.tsx:53-64`
- Evidence: `FieldControl` hand-rolls a raw `<select className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">` instead of using the vendored `NativeSelect` primitive at `components/ui/native-select.tsx`, which already implements the same control with focus/invalid/disabled states and a chevron icon.
- Consequence: The hand-rolled select misses `aria-invalid` ring styling, disabled cursor styling, and the dropdown chevron that `NativeSelect` provides - visual/a11y drift between two "the same control" implementations.
- Fix: Replace with `<NativeSelect {...common}>` / `NativeSelectOption`.
- Effort: S

### UI-13: DRY, low severity

- Location: `styles/globals.css:56-89,91-123` vs `styles/product.css:2-34,63-96`
- Evidence: Both files fully redefine `--background`, `--foreground`, `--muted-foreground`, `--border`, `--primary`, etc. for both `:root` and `.dark`. `product.css`'s header comment ("Loaded last so the entire customer UI can be reverted as one layer") explains this is intentional layering, but the two token sets can silently drift (e.g. `globals.css` defines no `--surface-sunken`/`--hairline`/`--shadow-*` tokens at all - those exist only in `product.css`, so any component using them breaks if `product.css` is ever "reverted" as the comment implies is a real scenario).
- Consequence: The override mechanism is real but undocumented as a _contract_ - nothing enforces that `product.css` defines every token `globals.css` defines, so the described revert path is untested/unverified.
- Fix: Add a lint/test asserting `product.css`'s `:root` is a superset of `globals.css`'s `:root` keys, or document which tokens are product.css-only and must not be relied on outside `product.css`-aware components.
- Effort: S

### UI-14: Clean code naming, low severity

- Location: `Collaboration/Primitives.tsx:3-7`
- Evidence: Imports use relative paths (`../../components/ui/avatar`) while every other composite in the package uses the `@ops/ui/components/ui/...` alias (see `StageSelect.tsx:1`, `RecordForm.tsx:4-7`, `ConfirmDialog.tsx:4-14`).
- Consequence: Inconsistent import style across composites in the same package makes refactors (e.g. moving `Collaboration`) more error-prone and is an easy tell for copy-pasted/unreviewed code.
- Fix: Switch to the `@ops/ui/components/ui/*` alias for consistency.
- Effort: S

### UI-16: Clean code magic values, low severity

- Location: `CalendarMonth.tsx:54,57`
- Evidence: `events.slice(0, 4)` and the "+N more" overflow threshold are inline magic numbers with no named constant, and the `+{events.length - 4} more` string is hardcoded English (not passed through the component's `labels`).
- Consequence: Changing the visible-events-per-day limit means hunting two locations; the overflow copy can't be translated even though `previous`/`next` labels are (inconsistent i18n coverage within the same component).
- Fix: Hoist `MAX_VISIBLE_EVENTS = 4` as a named constant; add an `overflowLabel` (template with `{count}`) to the `labels` prop.
- Effort: S

### UI-19: Clean code function size, low severity

- Location: `TaskSheet.tsx:103-202`
- Evidence: The exported `TaskSheet` function itself is ~100 lines with 3 layers of conditional JSX (`renderAsPage`, `onComplete` undefined, `onSaveDescription` undefined) inline in the return statement (`:158-168` spreads a conditionally-built object into JSX props).
- Consequence: Conditional prop-spreading (`{...(onSaveDescription === undefined ? {} : {...})}`) is a harder-to-read pattern than a guard/ternary component; combined with UI-03/UI-04 this is the single largest, most tangled component in the audited scope relative to its line count.
- Fix: After UI-03/UI-04 extraction, this shrinks naturally.
- Effort: M

### UI-20: DRY, low severity

- Location: `apps/web/src/i18n/work-copy.ts:26,129` (`unassigned`) vs `config.ts` (no `unassigned` key but similar "Unassigned" concept implied elsewhere) and `TaskSheet.tsx:24` (hardcoded `'Unassigned'`)
- Evidence: `TASK_COPY.unassigned` and `REPORT_COPY.unassigned` both translate "Unassigned" independently (harmless duplication across two legitimately different copy objects), but `TaskSheet.tsx:24` reimplements the same concept as a raw English string instead of consuming either.
- Consequence: Shows the i18n system is otherwise consistent (per-page copy objects are an accepted pattern here) - `TaskSheet` is the outlier that opts out of it entirely, reinforcing UI-01.
- Fix: Give `TaskSheet` its own `TaskSheetLabels.unassigned` per UI-01's fix.
- Effort: S

### UI-21: OCP, low severity

- Location: `RecordPageLayout.tsx:90,93`
- Evidence: Save/cancel affordances in the inline title-edit form are raw glyphs `✓` and `×` rather than icon components (the rest of the package uses `lucide-react`, e.g. `EllipsisVertical`, `ChevronLeft/Right`, `TriangleAlert` elsewhere).
- Consequence: Inconsistent icon strategy; glyphs render inconsistently across fonts/platforms and aren't `aria-hidden`-paired with the same rigor as the lucide icons used elsewhere (though `aria-label` is present here, mitigating the a11y risk).
- Fix: Swap for `Check`/`X` from `lucide-react` to match the rest of the package's icon usage.
- Effort: S

### UI-23: SRP, low severity

- Location: `GanttView.tsx:64-95,141-145`
- Evidence: `GanttView` contains DOM-patching functions (`repairRowIndexes`, `removeGripLabels`, `makeChartsFocusable`) that reach into the third-party library's rendered DOM via `querySelectorAll` with hand-picked CSS selectors (`ROW_SELECTOR`, `GRIP_SELECTOR`, `CHART_SELECTOR`) alongside the data-shaping (`model.ts` import) and the edit-blocking policy (`guardEdits`, `BLOCKED_ACTIONS`) - three distinct concerns in one component file.
- Consequence: A SVAR Gantt version bump that renames `.wx-grip`/`.wx-chart` classes breaks accessibility silently (no type safety on these selectors); mixing a11y-patching with edit-policy makes it harder to reason about either in isolation.
- Fix: Extract the accessibility-repair block into its own module (e.g. `gantt-a11y.ts`), parallel to how `model.ts` already isolates data shaping from `GanttView.tsx`.
- Effort: M

### UI-24: ISP, low severity

- Location: `TaskSheet.tsx:110-121` (`onSaveDescription`, `onComplete` both optional) vs `KanbanBoard.tsx:26-30` (`onMove` required, `onConflict` optional)
- Evidence: `TaskSheet` makes both of its two real callbacks optional, silently no-op'ing the corresponding UI (no Save button, no Complete button) when omitted, whereas `KanbanBoard` requires its core callback and only makes the secondary one optional.
- Consequence: Inconsistent policy for "what's required" across composites makes it unclear, without reading each implementation, whether omitting a callback is a supported minimal mode or a caller bug.
- Fix: Document (or enforce via a discriminated prop, e.g. `mode: 'readOnly' | 'editable'`) which callback combinations are actually supported call sites in `apps/web`.
- Effort: S

## Scripts and provisioning

### SCR-14: Clean code magic values / tenant leak, high severity

- Location: `scripts/seed/steps.ts:59-73` (`seedUsers`)
- Evidence: Hardcodes `seed.email === 'mirchads@gmail.com'` and a literal legacy email `'mirchads@example.test'` as a one-off migration branch inside otherwise tenant-agnostic seed logic; file carries a blanket `/* eslint-disable complexity, max-lines-per-function, max-depth, sonarjs/cognitive-complexity */` at the top (line 1) that suppresses the complexity gates for the whole file rather than isolating this branch.
- Consequence: Confirms the audit's known seed: this "shared" seed module is actually Mirch-Media-specific, and the disable directive hides that this one special case is what's driving the file's complexity past the gated limits.
- Fix: Extract the legacy-email migration into a small named function (`migrateLegacyOwnerEmail`) with a narrower disable comment, or move the literal into `data.ts`'s `USERS`/`APP_SETTINGS` seed data so `steps.ts` stays tenant-agnostic.
- Effort: M

### SCR-07: OCP, medium severity

- Location: `scripts/lib/provision/plan.ts:61-93` (`provisionPlan`) + `types.ts:3-17` (`ProvisionState`/`ProvisionStep`) + `execution.ts` per-step functions + `state.ts:parseStatus` allow-list (94-105)
- Evidence: Adding a new provisioning step requires editing: the `ProvisionState` interface, the plan array literal, `isComplete`/`shouldSkip` special cases, `executeStep`'s if-chain, and the `allowed` `Set` in `parseStatus`. Similarly, `hostType === 'platform'` is special-cased inline in the plan array (line 87-89) rather than being data-driven.
- Consequence: Five edit points for one new step is a classic OCP violation; a missed edit point (e.g. forgetting `parseStatus`'s allow-list) silently drops remote-discovered state.
- Fix: Model steps as objects carrying their own `isComplete`/`execute`/`serializable` behavior in one table, so plan/state/execution derive from it instead of parallel switch-like code.
- Effort: L

### SCR-08: ISP/DIP, medium severity

- Location: `scripts/lib/provision/types.ts:27-37` (`ProvisionDependencies`)
- Evidence: 9 optional fields (`run, state, check, root, turnstileSecret, writeD1Id, print, http, internalSecret`) mixing a command runner, a state store, a filesystem root, two secrets, and an HTTP client behind one bag consumed by both `provisionTenant` and (indirectly) executeSeed/executeRouterSecrets.
- Consequence: Callers/tests must supply or stub an oversized interface even when exercising one step; violates ISP and hides which capability a given code path actually needs.
- Fix: Split into role interfaces (`Runner`, `StateStore`, `HttpBoundary`, `SecretsSource`) composed per call as needed.
- Effort: M

### SCR-09: Clean code error handling, medium severity

- Location: `scripts/lib/provision/state.ts:69-79` (`discoverRemoteStatus`)
- Evidence: `catch { // Remote status is advisory during discovery; resource checks still fail closed. }` swallows every error (network, parse, auth) with no logging at all, not even to the `print` hook available elsewhere in the module.
- Consequence: An expired/invalid `internalSecret` or a 5xx from the status endpoint becomes silently indistinguishable from "no status configured," making provisioning drift hard to diagnose.
- Fix: At minimum log the swallowed error via the same `print` convention used elsewhere.
- Effort: S

### SCR-13: Clean code side effects, medium severity

- Location: `scripts/lib/provision/execution.ts:91-93` (`readAsset`)
- Evidence: `readAsset` calls `resolve(process.cwd(), path)` and reads a brand-asset file directly from disk deep inside a "seed body" builder, with no injected filesystem dependency - same pattern as `secretsFile`/`tempSecretsFile` writing via bare `process.cwd()`/`writeFileSync` rather than through `ProvisionDependencies`.
- Consequence: `ProvisionDependencies` already exists as the seam for injecting side effects (run, http, print) but filesystem/cwd access bypasses it everywhere in `plan.ts`/`execution.ts`, so tests exercising the secrets/brand-asset paths cannot avoid touching the real filesystem/cwd.
- Fix: Add an injectable `fs`/`cwd` port to `ProvisionDependencies` (or accept it narrows SCR-08's split) so provisioning tests never write real temp files.
- Effort: M

### SCR-15: Clean code function size, medium severity

- Location: `scripts/seed/steps.ts:57-100` (`seedUsers`), `176-199` (`seedAll`)
- Evidence: `seedUsers` is 44 lines with 3 levels of nesting (loop → if → nested if/await); `seedAll` orchestrates 9 sequential awaited steps in one function body with no intermediate abstraction beyond variable names.
- Consequence: Consistent with the file's own top-of-file gate suppression - this is exactly the kind of function the repo's `max-lines-per-function`/`max-depth` ESLint gates (in `tooling/eslint/rules.js:9-13`) are meant to catch, and it's opted out rather than restructured.
- Fix: Split the legacy-email special case (SCR-14) out of the loop body; consider a small step-runner instead of 9 manually sequenced awaits.
- Effort: M

### SCR-16: SRP, medium severity

- Location: `scripts/deploy-tenants.ts:10-33` (`main`)
- Evidence: `main` parses CLI args, enforces the `OPS_ALLOW_LIVE` safety gate, loads tenants, builds a runner, builds per-tenant smoke options (calling `smokeOptions`), runs the deploy loop, and formats+prints the summary line - six responsibilities in one 24-line function, mirrored by `smoke-tenant.ts`'s `main`/`runSmokeCli` doing the same mix of parse+gate+run+print.
- Consequence: Harder to unit test the "what deploy options a tenant gets" logic independently of process wiring; also duplicates the `OPS_ALLOW_LIVE` gate pattern (`deploy-tenants.ts:21-23` vs `smoke-tenant.ts:250-253` `assertLiveAllowed`) instead of sharing one guard.
- Fix: Extract a shared `assertLiveAllowed`/`OPS_ALLOW_LIVE` guard into `lib/provision/commands.ts` or similar, reused by both entry points.
- Effort: S

### SCR-20: Tooling, OCP, medium severity

- Location: `tooling/eslint/rules.js:1-25`, `tooling/jscpd/.jscpd.json`, `tooling/knip/knip.json`, `tooling/depcruise/.dependency-cruiser.cjs`
- Evidence: Four separate config files each independently list overlapping exclusion sets for generated/test paths (`scripts/fixtures/**` appears in `check-disables.ts:8`, `tooling/jscpd/.jscpd.json`; `apps/web/cloudflare-env.d.ts` appears in `check-brand.ts:15` and `tooling/depcruise/.dependency-cruiser.cjs:53`); no shared "generated/excluded paths" manifest.
- Consequence: Adding a new generated file (e.g. a future codegen output) requires remembering to update brand/vocab/disables/jscpd/depcruise exclusion lists separately; a miss causes false-positive findings rather than a build break, so it's easy to not notice.
- Fix: Low priority given the low churn rate of generated paths, but a shared `tooling/generated-paths.json` consumed by both the check scripts and tool configs would remove the duplication.
- Effort: M

### SCR-06: DRY, low severity

- Location: `scripts/lib/provision/plan.ts:103-107` (`secretsFile`) vs `execution.ts:112-116` (`tempSecretsFile`)
- Evidence: Both write `.tenant-secrets*-<slug>-<pid>.json` to `process.cwd()` with `mode: 0o600`; only the filename prefix differs (`.tenant-secrets-` vs `.tenant-secrets-router-`).
- Consequence: Same write-temp-secrets-file logic exists twice with slightly different names, which is exactly the seed noted in the task and the root cause behind SCR-01.
- Fix: Extract one `writeTempSecrets(prefix, tenant, payload)` used by both, returning a disposer.
- Effort: S

### SCR-10: Clean code magic values, low severity

- Location: `scripts/lib/provision/plan.ts:69,79,85,91` and `scripts/lib/provision/commands.ts:10-11`
- Evidence: Command strings are partially centralized (`WRANGLER`, `OPENNEXT` constants) but step commands still interpolate raw literals like `--env ${tenant.slug}`, `<temporary-secrets-file>` placeholder text, and `pnpm tenant:smoke ${tenant.slug} --execute` inline; the npm script name `tenant:smoke` is a magic string duplicated from `package.json`.
- Consequence: If the npm script is renamed, this silently drifts from `package.json` with no compile-time link.
- Fix: Not urgent given low churn, but consider a `SCRIPTS` constants map shared with `package.json` generation if that ever exists.
- Effort: S

### SCR-11: Clean code naming/comments, low severity

- Location: `scripts/lib/provision/plan.ts:15-16`
- Evidence: Two doc comments sit above unrelated code: `/** The observable completion state for the eleven provisioning steps. */` and `/** Commands needed... */` immediately precede `interface StepContext`, not `ProvisionState`/`ProvisionStep` (which are now in `types.ts`, imported on line 8).
- Consequence: Stale/misplaced comments describe types that no longer live in this file; a reader following the comment finds `StepContext` instead.
- Fix: Delete or move these two comments to `types.ts`.
- Effort: S

### SCR-12: DRY, low severity

- Location: `scripts/check-formatters.ts:28-30`
- Evidence: Manually parses `process.argv` for `--root` instead of using `node:util` `parseArgs` like every other `check-*.ts` script (`check-brand.ts:56-57`, `check-vocab.ts:31`, `check-docs.ts:64`, `check-i18n.ts:74`, `check-disables.ts:67`, `check-scope.ts:130-136`).
- Consequence: One-off argument parsing style breaks the otherwise-consistent CLI convention (`isMain` + `parseArgs({root...})` + `report(...)`) that the other six check scripts share, and doesn't support `--help`/type validation the way `parseArgs` does.
- Fix: Switch to `parseArgs({options:{root:{type:'string',default:process.cwd()}}})` to match siblings.
- Effort: S

### SCR-17: Clean code comments, low severity

- Location: `scripts/lib/provision/plan.ts:87-89`
- Evidence: Inline ternary building the `routerSecrets` step is uncommented at the point of OCP concern (SCR-07) while `dev.ts:6-9,24-27` carries two multi-line comments explaining _why_ the process is spawned/signalled directly - a good pattern (see below) that plan.ts's step-list branching doesn't match; the asymmetry makes the harder-to-follow code (conditional step injection) the less-commented one.
- Consequence: Not a defect per se, but the file's comment density is inversely correlated with where a reader needs help (OCP-fragile step list vs. straightforward dev wrapper).
- Fix: When addressing SCR-07, document why `platform` hostType alone gates `routerSecrets`.
- Effort: S

### SCR-19: Clean code naming, low severity

- Location: `scripts/lib/provision/types.ts:27-37` `ProvisionDependencies.check` vs `.writeD1Id` vs `.http`
- Evidence: Field names mix verbs/nouns inconsistently (`check`, `writeD1Id`, `print`, `http`, `run`) with no shared naming convention (verb-first vs noun) and no doc comments on any of the 9 fields, unlike most other exported functions in this codebase which are consistently TSDoc'd (per `check-docs.ts`'s own enforced convention for `packages/`).
- Consequence: Minor, but this file is exempt from the TSDoc gate (`check-docs.ts` only checks `packages/`), so `scripts/` interfaces like this one get no doc-coverage enforcement despite being just as load-bearing.
- Fix: Add short TSDoc per field, or extend `check:docs`-style coverage to `scripts/lib`.
- Effort: S

### SCR-21: Clean code parameter list, low severity

- Location: `scripts/smoke-tenant.ts:81-87` (`httpCheck` input object), `113-119` (`probeCheck`), `166-172` (`requestWithTimeout`)
- Evidence: All three functions already use single-object parameters (good discipline vs. long positional lists), but the objects themselves have grown to 4-5 optional/required fields with no named type - `httpCheck`'s inline type literal duplicates shape of `probeCheck`'s.
- Consequence: Not urgent; flagged because the object-literal duplication (rather than a shared `CheckInput<T>` type) is the seed of a future long-parameter-list problem as more checks are added.
- Fix: Factor a shared `CheckContext` type once a third/fourth check type is added.
- Effort: S

### SCR-22: Risk next to a good pattern, low severity

- Location: `scripts/reset-local-db.ts:1-19`, `scripts/seed/local-env.ts:9-21` (`assertLocalOnly`)
- Evidence: `reset-local-db.ts` correctly calls `assertLocalOnly(process.env)` before `rmSync` - but the guard only checks `NODE_ENV`/`CLOUDFLARE_ENV`/`PAYLOAD_REMOTE_BINDINGS`; it does not verify the resolved `stateDir` (from `localD1StateDir`, which does path-traverse validation) is actually a path the current user intends to delete versus a symlinked/misconfigured `.wrangler` directory pointing elsewhere.
- Consequence: Defense-in-depth gap: the path-safety check (`localD1StateDir`) and the environment-safety check (`assertLocalOnly`) are two separate concerns that both must hold, but nothing composes/tests them together as one "safe to rm -rf" contract.
- Fix: Consider a single `assertSafeToDeleteLocalState()` combining both checks so the invariant is co-located and testable as one unit.
- Effort: S
