# Agent guide

ops-platform is a white-label CRM and project/task platform: one codebase, deployed as an isolated Worker, D1 database and R2 bucket per tenant. No tenant is the product. Tenant names, domains, colours and people live only in `tenants/*.jsonc` and tenant settings.

[`docs/spec.md`](docs/spec.md) is authoritative for product behavior; §0 covers roles, ownership and escalation. [`docs/architecture.md`](docs/architecture.md) is the short map and lists the conventions every change keeps. [`docs/history.md`](docs/history.md) summarizes what has been built.

## Starting or resuming work

1. Read this file, then `git log --oneline -15` and `git status` to see where the branch stands.
2. Pick the next item of the first open wave in [`docs/roadmap.md`](docs/roadmap.md); the waves draw from the backlogs. [`docs/backlog/code-health.md`](docs/backlog/code-health.md) holds open DRY, SOLID and architecture findings with a refactor order; [`docs/backlog/ux.md`](docs/backlog/ux.md) holds open UX findings; [`docs/ux/reference-parity-backlog.md`](docs/ux/reference-parity-backlog.md) is the atomic parity inventory. Take the highest-severity item that no running task owns.
3. Load the matching skill from `.claude/skills/`: `add-use-case`, `add-api-endpoint`, `add-record-surface`, `fix-bug`, `ui-from-reference`, and `verify-change` for every change.
4. Delete the backlog entry in the commit that fixes it. When a fix is partial, rewrite the entry's status line to say what remains.

## Where things live

| Layer                              | Path                                                                                                                         | May import                                         |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Primitives (Result, errors, clock) | `packages/kernel`                                                                                                            | nothing from the workspace                         |
| Permissions, workflows, ports      | `packages/platform`                                                                                                          | kernel                                             |
| Domain: rules, schemas, use cases  | `packages/modules/{crm,work,intake,mail}`                                                                                    | kernel, platform, zod                              |
| Persistence and Cloudflare         | `packages/adapters/{payload,cloudflare}`                                                                                     | the above; only `adapters/payload` imports Payload |
| Presentational UI                  | `packages/ui` (primitives in `src/components/ui`, composites in `src/composites`)                                            | kernel types only; no data fetching                |
| Next.js app and composition root   | `apps/web` (routes in `src/app`, server actions in `src/server/actions`, product API in `src/server/api` + `src/app/api/v1`) | everything                                         |

`tooling/eslint/rules.js` and `tooling/depcruise/.dependency-cruiser.cjs` enforce these rules. Business rules belong in a module, not in `apps/web`.

## Golden examples

Copy these instead of inventing a new shape. The task skills walk through each one.

- Use case with a zod schema: `packages/modules/work/src/schema.ts` and `packages/modules/work/src/commands/tasks.ts`; with cross-entity rules, `packages/modules/crm/src/commands/conversion.ts` tested against the in-memory double `packages/modules/crm/test/memory-crm.ts`.
- Thin server action: `apps/web/src/server/actions/work/tasks/moveTask.ts`.
- API endpoint: a registry entry in `apps/web/src/server/api/contracts.ts` and the route `apps/web/src/app/api/v1/tasks/[id]/route.ts`.
- Result shape and error handling: `apps/web/src/server/action-result.ts`.
- Stage change with transaction and activity: `packages/platform/src/workflows/change-stage.ts`.
- Generic record list and detail: the `apps/web/src/app/(app)/directory-*.tsx` family (`directory-view`, `directory-list-view`, `directory-record-view`, `directory-form`, `directory-filters`) with `apps/web/src/server/crm/directory/data.ts`.
- Optimistic board move with rollback: `packages/ui/src/composites/KanbanBoard/board-state.ts`.

## Commands

| Command                                         | Use                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                                      | local app on port 3000 (`PORT=3001 pnpm dev` if taken)           |
| `pnpm db:reset:local && pnpm seed:dev`          | fresh local database                                             |
| `curl -s -b /tmp/ops.jar localhost:3001/api/v1` | every API endpoint with its body schema (sign in first, below)   |
| `pnpm verify:fast`                              | while working: format check, typecheck, lint, changed unit tests |
| `pnpm verify`                                   | before merging: every gate, tests, integration tests, build      |
| `pnpm test:e2e`                                 | Playwright, against a running app                                |

The static gates (`format:check`, `typecheck`, `lint`, `depcruise`, `knip`, `jscpd`, `check:*`) and unit tests take about a minute together; run them individually with `pnpm -s <name>` to see which one fails.

## Pitfalls

Each one caused a real defect here.

- Put shared types in a leaf contract module. Barrels only re-export, or dependency-cruiser reports a cycle.
- Scope predicates live in platform policy. Pass the authenticated request through every repository read.
- Board drops into a lost stage defer the write and restore the source stage and version on failure.
- Map a stage transition to the persisted Payload shape before writing the transition row; `stage-codecs.ts` in the Payload adapter owns that mapping.
- Customer sign-in stays on `/login`; product navigation never links to `/admin`.
- Tenant prefill comes only from the tenant manifest and seed.
- Server actions and API routes call a module use case. Do not call `payload.find` or `payload.create` from a route or action.
- Reuse an existing composite before writing a per-entity copy: `StagePill`, `StageSelect`, `ActivityFeed`, `DataTable`, `EmptyState`. Never add a raw `<select>` or date input where `@ops/ui` has one.
- Tailwind generates only class names that appear literally in source. Build variants from a literal table, as `STAGE_PILL` in `packages/ui/src/composites/KanbanBoard/stage-dot.ts` does, never by concatenating `bg-${color}/15`.
- Do not disable lint for a whole file. Use a scoped `eslint-disable-next-line <rule> -- <reason>`; `check:disables` rejects a directive that names no rule.
- User-facing copy goes through the i18n copy objects in `apps/web/src/i18n/`.
- Never send a raw exception message to the browser. Catch with `actionFailure(error, context, fallback)`.

## Verifying a change

Verify behavior against the running app, not with a new test file. The `verify-change` skill has the full procedure; in short:

```sh
PORT=3001 pnpm dev   # in the background
curl -s -c /tmp/ops.jar -H 'content-type: application/json' \
  -d '{"email":"<owner email>","password":"<DEV_PASSWORD>"}' http://localhost:3001/api/v1/auth/login
curl -s -b /tmp/ops.jar http://localhost:3001/api/v1   # what you can call
```

The owner email is the `owner` entry of `USERS` and the password is `DEV_PASSWORD`, both in `scripts/seed/data.ts`. Responses carry the outcome: `{ ok, data }`, or `{ ok: false, error: { code, message, fields? } }` with the HTTP status from spec §12.1. Write each check as a gate (the command, what you expect, what you saw) and put the gates in the commit body under `Verified:`.

Add a test only for a bug that neither a response nor a type can reveal: removed validation that still returns `ok`, a lost side effect such as an unwritten audit row, a permission or tenant-scope leak, or a race. Write it through the module's in-memory double, make it fail first, and commit it with the fix as `fix(scope): ...`. Never test config literals, source text, tenant values or code nothing calls.

## Working in parallel

Several agents may work at once in one checkout. Each task names the files it owns, and no two running tasks own the same file. Workers do not commit or push; the lead reviews and commits. Report completion once, when the task is done or blocked. Credentials, deploys and remote migrations stay with the lead.

A lead that delegates a refactor diffs the result against `HEAD` for removed checks, changed error messages and weakened types before committing. A delegated refactor can pass lint, typecheck and tests while dropping validation.

## References and licences

Reference products are cloned in `../references/`; `../references/README.md` lists their licences. MIT and Apache-2.0 code (Payload, `twenty/packages/twenty-ui`, Corteza, Agentic Inbox) may be copied with its licence notice kept, following `third_party/agentic-inbox/`. Plane, Twenty's application code, Frappe CRM, Huly and Odoo are behavior references only: re-implement, do not copy, until the code-licence decision says otherwise. That decision is open: ADR-0003 is reserved for it and not yet written (spec D-30, open question Q-001).

## Documentation

Load the technical-writing skill before changing documentation. State current behavior; git history is the change log. Findings go in `docs/backlog/`, decisions in `docs/adr/`, and API rules in spec §12.
