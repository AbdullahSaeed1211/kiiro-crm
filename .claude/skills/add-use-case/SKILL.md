---
name: add-use-case
description: Use when adding a new write operation (command) to the CRM or work domain — a new state transition, conversion, or action that must be reachable from a server action.
---

# Add a use case (domain command)

Layer order: `packages/kernel` → `packages/platform` (permissions, workflows, ports) →
`packages/modules/{crm,work,intake,mail}` (commands, ports, zod schemas) →
`packages/adapters/payload` (only place Payload is imported) → `packages/ui` (no data
fetching) → `apps/web` (server actions, deps wiring). Boundaries are enforced by
`tooling/eslint/rules.js` and `tooling/depcruise/.dependency-cruiser.cjs` — a module
importing Payload or another sibling module, or `packages/ui` fetching data, fails
`pnpm depcruise`/`pnpm lint`.

## Steps

1. Add/extend the zod input schema in `packages/modules/<module>/src/schema/index.ts`.
2. Write the command in `packages/modules/<module>/src/commands/<name>.ts`. It takes
   `(deps, input: unknown)`, parses with the schema, loads records through
   `deps.repo`, applies domain rules (validation, permission checks via
   `packages/platform/src/permissions`, stage transitions via
   `packages/platform/src/workflows`), and returns `CrmResult<T>` /
   equivalent ok/failure shape — never throws for expected failures.
3. If the command needs a new repository/port method, add it to
   `packages/modules/<module>/src/ports/repository.ts` (interface only), implement it
   in `packages/adapters/payload/src/repositories/`, and add an in-memory
   implementation to the module's test double.
4. Write a unit test in `packages/modules/<module>/test/` against the in-memory
   double — no Payload, no HTTP.
5. Wire a server action in `apps/web/src/server/actions/<module>/**`. It must call the
   command through the deps object built in `apps/web/src/server/crm/deps.ts` (CRM) or
   `apps/web/src/server/work/command-deps.ts` (work) — never call `payload.find/create/update`
   directly from the action.
6. If the command changes a workflow stage, reuse the module's existing stage path
   instead of writing a new one: CRM records go through `movePipeline`
   (`packages/modules/crm/src/domain/helpers.ts`, which calls platform
   `changeStage`); tasks go through `moveTask` → `repo.saveTaskMove`
   (`packages/modules/work/src/commands/task-stage.ts`), which writes the transition row.

## Golden examples

- Command with cross-entity rules: `packages/modules/crm/src/commands/conversion.ts`
  (lead→deal conversion and mark-lost, lines 1–60 show the shape: parse → find →
  validate → mutate via a shared `finishConversion` helper).
- In-memory test double for the CRM module: `packages/modules/crm/test/memory-crm.ts`
  (185 lines) — copy this pattern rather than mocking Payload.
- Simple stage-move command: `packages/modules/work/src/commands/task-stage.ts` (187
  lines) → thin server action `apps/web/src/server/actions/work/tasks/moveTask.ts` (19
  lines) — the action only calls the command and revalidates paths, no logic.
- Generic stage workflow: `packages/platform/src/workflows/change-stage.ts` (89
  lines); port contracts: `packages/platform/src/contracts/ports.ts` (52 lines).
- Deps wiring: `apps/web/src/server/crm/deps.ts`, `apps/web/src/server/work/command-deps.ts`.

## Rules / pitfalls

- Domain rules never live in `apps/web`. Anti-pattern:
  `apps/web/src/server/crm/leads/types.ts` has `leadStageMoveError` (line 65) and an
  `initials()` helper (line 40) that belong in the module/UI layer, not a server
  route file — don't add to that file; if touching it, consider moving logic out.
- Server actions never call `payload.*` directly. Anti-pattern:
  `apps/web/src/server/actions/settings/members.ts` calls `context.payload.update`/
  `.find`/`.create` inline (lines 79, 98, 118, 162, 188, 209–210) — new actions must
  go through a repository/command, not repeat this.
- Commands take `unknown` input and parse it themselves; don't push validation into
  the action or UI.

## Done when

- `pnpm typecheck && pnpm lint && pnpm depcruise` pass.
- A new unit test in the module's `test/` fails without the command's core rule and
  passes with it.
- `pnpm verify:fast` passes (format, typecheck, lint, changed unit tests).
