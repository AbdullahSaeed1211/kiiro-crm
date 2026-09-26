# Wave 3 plan: one error model and an identity module

Seven tasks that finish the move to use cases returning `Result`: one composition root, adapters that return failures instead of throwing, one client error helper, an identity module for membership, split adapter and form files, and a shorter Payload-in-routes debt list. The wave's scope is in [the roadmap](../roadmap.md#3-one-error-model-and-an-identity-module); findings are in [the code-health backlog](../backlog/code-health.md).

## Order

| Group | Tasks                        | Starts when                                                      |
| ----- | ---------------------------- | ---------------------------------------------------------------- |
| A     | W3-1                         | now, alone: it changes the import sites every other task touches |
| B     | W3-2, W3-3, W3-4, W3-5, W3-6 | W3-1 is committed, in parallel                                   |
| C     | W3-7                         | W3-4 is committed                                                |

## Every task

- Follow `AGENTS.md` and load the `verify-change` skill; W3-4 also loads `add-use-case` and `add-api-endpoint`.
- Keep behavior unchanged unless the task says otherwise; a delegated refactor is diffed against `HEAD` for removed checks and messages before it is committed.
- Delete each closed finding from the backlog in the same commit.

## W3-1: One composition root

Closes ARCH-04.

- Owns: new `apps/web/src/server/container.ts`; `apps/web/src/server/crm/deps.ts`, `apps/web/src/server/work/deps.ts`, `apps/web/src/server/work/command-deps.ts` (folded into the container); every file that imports them (29 today, found with `grep -rln "getWorkDeps\|getCrmDeps\|getWorkCommandDeps" apps/web/src`).
- Steps: build each module's dependencies in `container.ts` from an explicit request context, with `findProductContext` for API routes and `getProductContext` for pages and actions; replace the three deps files and update the import sites mechanically.
- Gates: `grep` finds no import of the removed files; all static gates pass; the task and project API gates from the `verify-change` skill still pass.

## W3-2: Adapters return failures instead of throwing

Closes DOM-09, DOM-05, DOM-06, DOM-14.

- Owns: `packages/adapters/payload/src/repositories/task-repository.ts`, `task-queries.ts`, `task-write-data.ts`, `crm/crm-repository.ts`; the work and CRM ports that change signature (`packages/modules/work/src/ports/*`, `packages/modules/crm/src/ports/*`) and the commands that call the changed methods.
- Steps: return a `Result` with `UNAVAILABLE` when no workflow is configured and `INTERNAL` when a created document cannot be mapped, instead of `throw new Error`; share one paginated find helper and one "update then map" helper between the repositories; merge the identical `mapProject` and `mapTask`.
- Gates: with the task workflow deleted locally, `POST /api/v1/tasks` returns 503 `UNAVAILABLE` with its message instead of a 500; every repository test passes.

## W3-3: One client error helper

Closes WEB-22, WEB-23, WEB-24.

- Owns: new `apps/web/src/app/(app)/client-errors.ts`; `apps/web/src/app/(app)/settings/member-forms.tsx`, `apps/web/src/app/(app)/record-related-tabs.tsx`, `apps/web/src/app/(app)/workspace-notifications.tsx`, `apps/web/src/app/(app)/tasks/error.tsx`.
- Steps: replace each bare `catch {}` with a helper that logs the error to the console with a context label and returns copy that separates a network failure ("Check your connection and try again") from a server failure; give the task error boundary copy naming the task view and its digest.
- Gates: with the dev server stopped mid-action, each form shows the network copy; the browser console shows the context label.

## W3-4: An identity module for membership

Closes ARCH-01, ARCH-06, and moves `apps/web/src/server/actions/settings/members.ts` off direct Payload calls.

- Owns: new `packages/modules/identity/` (schema, commands, ports, in-memory double), new `packages/adapters/payload/src/repositories/identity-repository.ts`, `apps/web/src/server/actions/settings/members.ts`, new `/api/v1/members` and `/api/v1/invitations` routes and their contract registry entries.
- Steps: move invite, resend, revoke, member role change and group membership into commands with zod schemas and the existing permission rules (owner and manager only; managers cannot assign owner; the last active owner is protected); implement the ports in the Payload adapter; make the server actions thin; expose the use cases on `/api/v1`.
- Gates: `members.ts` contains no `payload.` call; `POST /api/v1/invitations` for an existing member returns 409 with the existing message; a manager inviting an owner returns 403; a module test covers the last-active-owner rule, which no response reveals until a second owner is removed.

## W3-5: Split the mail and job adapters

Closes DOM-07, DOM-08, DOM-16, DOM-03, DOM-04, DOM-10, DOM-12.

- Owns: `packages/adapters/payload/src/repositories/mail-store.ts`, `job-store.ts` (split into files under `repositories/mail/` and `repositories/jobs/`), `packages/adapters/cloudflare/src/cron/job-support.ts`.
- Steps: split by responsibility (message storage, record-address resolution, sender verification, notification fan-out; cursors, claims, one file per job's target query); replace the hard-coded record-type maps with one registry of mailable and stale-trackable collections; make required job sources non-optional; remove both file-wide lint waivers.
- Gates: `check:disables` reports no file-wide waiver in the adapter; the job-store and mail tests pass unchanged; the internal cron route still reports every job for a scheduled time.

## W3-6: Split the intake form editor and the directory loader

Closes WEB-11, WEB-13, and SCR-09.

- Owns: `apps/web/src/app/(app)/settings/intake/intake-forms.tsx` (split into files under `settings/intake/`), `apps/web/src/server/crm/directory/data.ts` (split into `directory/contacts.ts`, `directory/organizations.ts`, `directory/query.ts`), `scripts/lib/provision/state.ts`.
- Steps: split each file by component or record type with no behavior change; remove the `max-lines` waiver on `data.ts`; log the swallowed error in `discoverRemoteStatus` through the provisioning `print` hook.
- Gates: `/settings/intake` and the contacts and organizations directories render and save as before at 1440px and 390px; no file in the split exceeds 250 lines.

## W3-7: Shrink the Payload-in-routes debt list

Closes ARCH-02 when the list is empty; each commit shortens it.

- Owns: the files in `PAYLOAD_IN_ROUTES_DEBT` in `tooling/depcruise/.dependency-cruiser.cjs` that W3-4 did not move, one route family per commit (settings pages, comments, files, notifications, email, intake, internal).
- Steps: move each route's Payload calls behind a `server/` query or a module command and delete the route from the list.
- Gates: `pnpm depcruise` passes with the shorter list; each moved route's behavior is checked with curl or in the browser.
