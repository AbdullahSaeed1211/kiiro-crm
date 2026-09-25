---
name: add-use-case
description: Use when adding a new write operation (command) to the CRM or work domain; a new state transition, conversion, or action that must be reachable from a server action.
---

# Add a use case (domain command)

Layer order: `packages/kernel` → `packages/platform` (permissions, workflows, ports) →
`packages/modules/{crm,work,intake,mail}` (commands, ports, zod schemas) →
`packages/adapters/payload` (only place Payload is imported) → `packages/ui` (no data
fetching) → `apps/web` (server actions, deps wiring). Boundaries are enforced by
`tooling/eslint/rules.js` and `tooling/depcruise/.dependency-cruiser.cjs`; a module
importing Payload or another sibling module, or `packages/ui` fetching data, fails
`pnpm depcruise`/`pnpm lint`.

## Steps

1. Add or extend the zod input schema in the module (`packages/modules/crm/src/schema/index.ts`,
   `packages/modules/work/src/schema.ts`) and export it from the module's `index.ts`. The schema
   is the only place the rule lives: the command, the product API and its `GET /api/v1` index all
   read it. Give user-facing messages to the rules a person can break (`min(1, 'Enter a title.')`).
2. Write the command in `packages/modules/<module>/src/commands/<name>.ts`. It takes
   `(deps, input: unknown)`, parses with the schema, loads records through
   `deps.repo`, applies domain rules (validation, permission checks via
   `packages/platform/src/permissions`, stage transitions via
   `packages/platform/src/workflows`), and returns a kernel `Result`; never throws for
   expected failures. Parse failures return `err(invalidInput(message, parsed.error.issues))`
   (`@ops/kernel`), or `parse()` in CRM, so the response names each invalid field.
3. If the command needs a new repository/port method, add it to
   `packages/modules/<module>/src/ports/repository.ts` (interface only), implement it
   in `packages/adapters/payload/src/repositories/`, and add an in-memory
   implementation to the module's test double.
4. Wire a server action in `apps/web/src/server/actions/<module>/**`. It must call the
   command through the deps object built in `apps/web/src/server/crm/deps.ts` (CRM) or
   `apps/web/src/server/work/command-deps.ts` (work); never call `payload.find/create/update`
   directly from the action. Return `toActionResult(result)` from `apps/web/src/server/action-result.ts`
   and catch unexpected exceptions with `actionFailure`.
5. Expose it on the product API with the `add-api-endpoint` skill, so it can be verified with curl.
6. If the command changes a workflow stage, reuse the module's existing stage path
   instead of writing a new one: CRM records go through `movePipeline`
   (`packages/modules/crm/src/domain/helpers.ts`, which calls platform
   `changeStage`); tasks go through `moveTask` → `repo.saveTaskMove`
   (`packages/modules/work/src/commands/task-stage.ts`), which writes the transition row.

## Golden examples

- Command with cross-entity rules: `packages/modules/crm/src/commands/conversion.ts`
  (lead→deal conversion and mark-lost, lines 1-60 show the shape: parse → find →
  validate → mutate via a shared `finishConversion` helper).
- In-memory test double for the CRM module: `packages/modules/crm/test/memory-crm.ts`
  (185 lines); copy this pattern rather than mocking Payload.
- Simple stage-move command: `packages/modules/work/src/commands/task-stage.ts` (187
  lines) → thin server action `apps/web/src/server/actions/work/tasks/moveTask.ts` (19
  lines); the action only calls the command and revalidates paths, no logic.
- Generic stage workflow: `packages/platform/src/workflows/change-stage.ts` (89
  lines); port contracts: `packages/platform/src/contracts/ports.ts` (52 lines).
- Deps wiring: `apps/web/src/server/crm/deps.ts`, `apps/web/src/server/work/command-deps.ts`.

## Rules / pitfalls

- Domain rules never live in `apps/web`. Anti-pattern:
  `apps/web/src/server/crm/leads/types.ts` has `leadStageMoveError`, which belongs in the CRM
  module (code-health WEB-16, WEB-17); don't add to that file; if touching it, move the rule out.
- Server actions never call `payload.*` directly. Anti-pattern:
  `apps/web/src/server/actions/settings/members.ts` calls `context.payload.find`/`.create`/
  `.update` inline (code-health ARCH-01); new actions go through a repository and command.
- Commands take `unknown` input and parse it themselves; don't push validation into
  the action or UI.

## Done when

- `pnpm typecheck && pnpm lint && pnpm depcruise` pass.
- The `verify-change` gates pass against the running app: the success path, each validation
  failure (400 with `error.fields`), the permission failure (403) and a stale version (409).
- Add a module test only when the rule's failure cannot show in a response: a lost side effect,
  a scope leak or a race (see `verify-change`).
