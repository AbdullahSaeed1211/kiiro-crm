# Code-health backlog

35 findings are open: 3 high, 15 medium and 17 low severity. They come from a DRY, SOLID, Clean Code and Clean Architecture review of the whole repository at commit `cc6b2d6`; 21 findings from that review are already fixed and are not listed. Line numbers were recorded at that commit, so confirm each location before editing.

## How to use this backlog

- [The roadmap](../roadmap.md) assigns every finding to one wave; work a finding as part of its wave.
- Fix a whole root cause where you can: one shared change closes every finding in its group.
- Delete a finding from this file in the commit that fixes it. When a fix is partial, replace its status line with what remains.
- Keep each fix behavior-preserving unless the finding says otherwise, and verify it as described in [AGENTS.md](../../AGENTS.md#verifying-a-change).

## Root causes

| Root cause                                                                                                                         | Severity | Open findings                      |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| Two maturity levels: identity, settings, comments and auth call Payload directly, with no use case, transaction or activity record | High     | ARCH-05                            |
| Large files carry permanent `max-lines` and `complexity` waivers instead of being split                                            | High     | WEB-14 SCR-14                      |
| Each record type copies the list, board, lost dialog, activity card, stage picker and conflict handling                            | High     | WEB-04 WEB-27 WEB-31               |
| Domain rules live in the web layer: lead move legality, display names, saved-view parsing, currency defaults                       | High     | WEB-10 WEB-14 DOM-02               |
| One concept, several implementations: time zone list, theme tokens, date formatting                                                | Medium   | UI-13                              |
| Record-type lists are synced by hand across maps and if-chains                                                                     | Medium   | DOM-18 WEB-18 WEB-28 SCR-07 SCR-20 |
| UI composites break their own rules: inline English copy, unused row selection, ignored locale props                               | Medium   | UI-07                              |
| Provisioning state has no owner: a nine-field optional dependency bag and `process.cwd()` read deep in helpers                     | Medium   | SCR-06 SCR-08 SCR-13 SCR-16 SCR-19 |

## Refactor order

Each step keeps `pnpm verify` green and makes the next one safer.

1. Done: adapters return `Result`, and client `catch` blocks report through `describeClientError`.
2. Done: one composition root (`server/container.ts`) and the identity module (`packages/modules/identity`).
3. Move web-layer rules into the modules: lead move legality, display names, saved-view parsing and currency defaults (WEB-10, WEB-14,,).
4. Build generic record machinery. Extend the contacts and organizations `directory-view` approach to leads, deals and tasks: shared lists, boards, lost dialog, activity feed and conflict handling. This also closes most of the [UX backlog](ux.md).
5. Split the oversized files: `member-forms`.
6. Done: no route calls Payload outside the admin group.

## Patterns to copy

- `packages/platform/src/workflows/change-stage.ts`: a port-based use case with a transaction and an activity record. Every other write should work this way.
- `apps/web/src/app/(app)/directory-view.tsx` with `apps/web/src/server/crm/directory/data.ts`: the template for generic record machinery.
- `packages/adapters/payload/src/repositories/local-api.ts` compare-and-set helpers, the table-driven `record-codecs.ts`, and the declarative `access/rules.ts`.
- `packages/ui/src/composites/KanbanBoard/board-state.ts`: an optimistic-update state machine with rollback.

## Architecture

### ARCH-03: No explicit application/use-case package, medium severity

- Location: `packages/modules/crm/src/commands/*.ts`, `packages/modules/work/src/commands/*.ts`
- Evidence: Use cases exist as flat functions in a `commands/` folder mixed with schema/domain helpers in the same package, not a separate `application` layer with named interactors
- Consequence: Fine at current size (crm 1,319 LOC) but as modules grow, no seam exists to keep entities (invariant-only) separate from orchestration (transactions, access checks, events) - `conversion.ts` already mixes both
- Fix: Split each module into `domain/` (pure entities/invariants) and `application/` (commands/use cases) subfolders; enforce via boundaries config
- Effort: M

### ARCH-05: Screaming architecture (partial), low severity

- Location: `apps/web/src/app/(app)/**` route names (`leads`, `deals`, `tasks`, `projects`) vs `apps/web/src/server/actions/settings/**`
- Evidence: Route folders scream CRM/work domain; but `server/actions` mixes true domain actions (`work/tasks/*`) with framework-shaped ad hoc handlers (`settings/members.ts`) under one flat "actions" bucket rather than by bounded context
- Consequence: Harder to see at a glance which server actions are backed by a tested module use case vs. inline Payload code
- Fix: Reorganize `server/actions` by bounded context (`actions/identity`, `actions/crm`, `actions/work`) mirroring `packages/modules/*`
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

### DOM-15: SRP, low severity

- Location: `packages/modules/crm/src/domain/helpers.ts` (247 lines)
- Evidence: File mixes generic command scaffolding (`failure`, `parse`, `executeCommand`, `accessDenied`) with pipeline-move business logic (`validatePipelineMove`, `persistPipelineMove`, `finalizeDealMove`, `movePipeline`) and lead-conversion lookups (`findExistingDeal`, `findExistingOrganization`, `dealCustomData`).
- Consequence: Three distinct responsibilities (command infra / stage-move orchestration / conversion helpers) share one "helpers" file, which is a classic SRP smell - hard to find things, and unrelated changes (e.g. tweaking conversion custom-data selection) touch a file that also contains security-sensitive `accessDenied`.
- Fix: Split into `command-support.ts`, `pipeline-move.ts`, `conversion-support.ts`.
- Effort: S

### DOM-18: OCP, low severity

- Location: `packages/modules/crm/src/commands/crud.ts:20-29,31-40` and `pipeline.ts:78-92`
- Evidence: `organizationPatch`, `contactPatch`, `leadPatch`, `dealPatch` each hand-list which fields need `cleanNullable`/`id`/`ids` normalization; `leadPatch` uses a `normalizeLeadEntry` switch-like if-chain on field name strings (`'assigneeIds'`, `['firstName','lastName',...]`, `['organizationId','sourceId','ownerId']`).
- Consequence: Adding a new nullable/ref field to any CRM record type means finding and editing the matching per-type patch function and remembering to add its key to the right string list; nothing enforces the field lists stay consistent with the schema in `packages/modules/crm/src/schema/index.ts`.
- Fix: Drive patch normalization from the same `Codecs` table already used for encode/decode in `record-codecs.ts` (it already knows which fields are refs/nullable) instead of re-listing field names per patch function.
- Effort: M

## Web app (`apps/web`)

### WEB-12: SRP, high severity

- Location: `apps/web/src/app/(app)/deals/[id]/page.tsx`
- Evidence: One file mixes: activity rendering (`ActivityCard`), money/date formatting glue, contact-name joining (`[contact.firstName, contact.lastName].filter(Boolean).join(' ')` duplicated at lines 92 and 121), layout composition, and data fetching orchestration
- Consequence: Any of these four concerns changing forces touching the same file; the name-joining logic is copy-pasted twice in the same file
- Fix: Move `displayName`-style helpers to view-model, keep the page as pure composition
- Effort: M

### WEB-27: DRY, high severity

- Status: `useVersionedAction` (`apps/web/src/app/(app)/use-versioned-action.ts`) now serves the lead record, the lost-reason dialog, the convert dialog and the contact and organization forms.
- Location: `timeline/save-dates.ts` and the board models (`lead-board-model.ts`, `deal-board-model.ts`, `TaskBoard.tsx`)
- Evidence: The timeline's date save and the three boards still detect CONFLICT and refresh on their own (the boards through the Kanban composite's `onConflict`).
- Fix: Move the timeline save onto the hook; leave the boards on the composite, which already owns their optimistic rollback.
- Effort: S

### WEB-04: DRY, medium severity

- Location: `apps/web/src/app/(app)/tasks/[id]/TaskAssigneeForm.tsx`
- Evidence: Separate assignee-editing form outside `TaskSheet`, using raw unstyled `<select multiple>`/`<button>` instead of `@ops/ui` components, and its own save/error handling
- Consequence: Editing assignees behaves and looks different depending on which surface you use; a second place to keep permission/optimistic-concurrency logic in sync
- Fix: Fold assignee editing into `TaskSheet`/`TaskDetailDrawer` and delete this component
- Effort: M

### WEB-14: SRP, medium severity

- Location: `apps/web/src/app/(app)/tasks/page.tsx` (328 lines, `eslint-disable max-lines`)
- Evidence: Single file: cell renderers, column defs, pagination, saved-view JSON decoding (a parsing/validation concern), and the page component itself
- Consequence: Saved-view decoding (untyped JSON→typed sort/mode) is a data-layer concern trapped in a page component, untestable in isolation
- Fix: Move `savedViewSort`/`savedViewMode`/`taskModeOf`/`parseTaskView` to `server/queries/settings/listSavedViews.ts` or a `task-view-params.ts` module; keep page.tsx to layout + fetch
- Effort: M

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

### WEB-26: Clean code side effects, medium severity

- Location: `apps/web/src/app/(app)/leads/LostReasonDialog.tsx:117-123`
- Evidence: `submit()` calls `router.refresh()` on the CONFLICT error path but not on other error paths, silently, inside a dialog component whose name suggests pure form state
- Consequence: A reader can't tell from the component's shape that a failed save can trigger a full route refresh; conflict-specific refresh logic is a domain rule (optimistic concurrency) hidden in a leaf UI component
- Fix: Centralize the "on CONFLICT, refresh" policy in whatever shared mutation hook eventually wraps `expectedUpdatedAt` actions (see WEB-27)
- Effort: M

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

## UI package (`packages/ui`)

### UI-05: DRY, medium severity

- Location: `GanttView/gantt-theme.css:8,24-27` vs `StagePill/stage.ts`, `KanbanBoard/stage-dot.ts`
- Evidence: Gantt bars are themed with `--wx-gantt-task-color/-fill-color/-border-color: var(--primary)`, while every other stage-aware surface (StagePill, StageSelect, KanbanBoard, FilterBar) colors by `--stage-*` tokens via `STAGE_DOT`/`stageDotClass`.
- Consequence: Gantt bars can never visually match a task's stage color the way Kanban cards and pills do; the theme file re-derives generic colors instead of consuming the shared stage-color system.
- Fix: Pass the bar's resolved `--stage-*` value through inline style or a `data-stage-color` attribute consumed by `gantt-theme.css`, reusing `stageDotClass`.
- Effort: M

### UI-17: Clean code side effects, medium severity

- Location: `theme/ThemeProvider.tsx:12-18,24-29`
- Evidence: `applyTheme` toggles a `theme-switching` class on/off synchronously in the same tick (add then immediately remove, `:15-17`) - its purpose (presumably disabling transitions during the swap) is defeated because no rAF/timeout separates the add from the remove. Separately, `ThemeChoice` includes `'system'`, and `setTheme('system')` clears storage, but the initial-load effect (`:24-29`) only ever resolves to `'dark'` or `'light'` from storage - `prefers-color-scheme` is never read, so "system" always renders as light on load.
- Consequence: The `theme-switching` class can never have any CSS effect as written (classic no-op side effect); "system" theme silently behaves as "light," which is surprising given the exported type promises three real states.
- Fix: Use `requestAnimationFrame`/a `transitionend`-based removal for `theme-switching`; read `window.matchMedia('(prefers-color-scheme: dark)')` when `choice === 'system'`.
- Effort: M

### UI-07: ISP, low severity

- Location: `DataTable.tsx:22-36`
- Evidence: `DataTableProps` mixes pagination, sorting, labels (7 sub-keys), an unused `selectable` flag, and a `toolbarStart` slot; every caller must supply the full `DataTableLabels` including `selectAll`/`selectRow` even when a table does not select rows.
- Consequence: Callers pay a translation and typing tax for a feature they never use.
- Fix: Once is resolved, shrink `DataTableLabels` to only the fields actually rendered.
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

## Scripts and provisioning

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

### SCR-13: Clean code side effects, medium severity

- Location: `scripts/lib/provision/execution.ts:91-93` (`readAsset`)
- Evidence: `readAsset` calls `resolve(process.cwd(), path)` and reads a brand-asset file directly from disk deep inside a "seed body" builder, with no injected filesystem dependency - same pattern as `secretsFile`/`tempSecretsFile` writing via bare `process.cwd()`/`writeFileSync` rather than through `ProvisionDependencies`.
- Consequence: `ProvisionDependencies` already exists as the seam for injecting side effects (run, http, print) but filesystem/cwd access bypasses it everywhere in `plan.ts`/`execution.ts`, so tests exercising the secrets/brand-asset paths cannot avoid touching the real filesystem/cwd.
- Fix: Add an injectable `fs`/`cwd` port to `ProvisionDependencies` (or accept it narrows SCR-08's split) so provisioning tests never write real temp files.
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

### SCR-10: Clean code magic values, low severity

- Location: `scripts/lib/provision/plan.ts:69,79,85,91` and `scripts/lib/provision/commands.ts:10-11`
- Evidence: Command strings are partially centralized (`WRANGLER`, `OPENNEXT` constants) but step commands still interpolate raw literals like `--env ${tenant.slug}`, `<temporary-secrets-file>` placeholder text, and `pnpm tenant:smoke ${tenant.slug} --execute` inline; the npm script name `tenant:smoke` is a magic string duplicated from `package.json`.
- Consequence: If the npm script is renamed, this silently drifts from `package.json` with no compile-time link.
- Fix: Not urgent given low churn, but consider a `SCRIPTS` constants map shared with `package.json` generation if that ever exists.
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

## Tooling and operations

Findings about the delivery tooling rather than the product code. IDs continue from OPS-01.

### OPS-01: The three largest test files hold most of the remaining test code

- Location: `tests/e2e/customer/route-health.spec.ts` (808 lines), `packages/adapters/payload/test/repositories/job-store.test.ts` (401 lines), `tests/e2e/spike/smoke.spec.ts` (280 lines).
- Fix: keep the flows and races they guard, and remove cases that only assert headings, literals or mechanics. Fold the spike smoke flows that duplicate `route-health` into it.
- Effort: M

### OPS-02: Knip counts tests as consumers, so dead production code survives

- Location: `tooling/knip/knip.json`.
- Evidence: `runMoveTask` stayed alive only through its test until it was deleted by hand. `knip --production` is too noisy without entry markers for route files and scripts.
- Fix: add production entry points for `apps/web/src/app/**` route and page files and `scripts/*.ts`, then run `knip --production` in `pnpm verify`.
- Effort: S

### OPS-03: No pre-commit hook

- Location: repository root.
- Evidence: formatting and lint failures reach CI; the agent format hook in `.claude/hooks/` covers only agent edits.
- Fix: decide in an ADR whether to add a hook dependency (for example lefthook) running `pnpm verify:fast` on staged files; a new dependency needs that decision.
- Effort: S
