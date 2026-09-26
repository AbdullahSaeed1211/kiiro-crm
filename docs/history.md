# Build history

This file is a condensed build history of the ops-platform codebase, a white-label CRM and project/task operations product deployed as one isolated instance per customer tenant. It replaces the milestone reports and orchestration records under `docs/orchestration/`, `docs/reports/{m0,m1-spike,m2,m3,pilot-improvement-log}.md` and `harness/lessons/`, which are removed once this file is in place. Git history remains the detailed record: every commit referenced below can be inspected with `git show <hash>`, and the full milestone sequence can be walked with `git log --oneline`.

## M0: bootstrap

M0 stood up the repository.

What shipped:

- A pnpm workspace with pinned toolchain versions (spec §4).
- The Payload 3 on Next.js 16 scaffold targeting Cloudflare Workers, D1 and R2.
- Package skeletons for the kernel, platform, CRM/work/intake/mail modules, the Payload and Cloudflare adapters, the UI package and tenant templates.
- The repository checks: brand-name, vocabulary, disable-comment, docs and size checks, each enforced in CI. A work-package scope check also shipped here; it was removed with the agent harness on 2026-09-25.

Key decisions:

- ADR-0001 (foundation) chose Payload 3 + Next.js 16 via OpenNext on Cloudflare Workers over forking an AGPL reference product (Frappe CRM, Twenty, Plane, Huly) or standing up a per-tenant server (Laravel/Railway).
- ADR-0002 (tenancy) chose one Worker, one D1 database, one R2 bucket and one settings record per tenant, with no shared-row multitenancy.
- Decision register entries D-01 through D-50 in `docs/spec.md` §2 fixed the toolchain, data model conventions (UUIDs, UTC epoch ms timestamps, integer minor-unit money) and the dependency allowlist.

Defect found and fixed:

- A `next build` attempted a remote Wrangler preview session against the wrong (customer-owned) Cloudflare account, because the scaffold's `wrangler.jsonc` defaulted `remote: true`. Fixed by making remote Cloudflare bindings opt-in (`PAYLOAD_REMOTE_BINDINGS=1`), with local-only bindings by default.

Representative commits: `4fdcb2c` (bootstrap workspace, tooling, harness, docs, Payload scaffold), `051d5dd` (repository check scripts), `596f475` (CI workflow), `1dec390` / `445f63e` / `3068482` (wave 1 merges), `1406cb5` (local-only bindings fix), `2f2b9ff` (M0 report).

Left open: a neutral platform-operator Cloudflare account was still needed (the working account belonged to the first tenant), `PLATFORM_DOMAIN` was not yet registered, and no GitHub organization or CI run existed yet.

## M1: spike

M1 answered the foundation question from ADR-0001: does Payload 3 + Next.js 16 on Cloudflare Workers (D1, R2) carry the product, or does the platform fall back to the Vite/Hono/Better Auth/Drizzle stack (D-02)?

What shipped:

- A Worker entry with OpenNext fetch, cron forwarding and inbound-email forwarding.
- Payload collections for users, groups, organizations, projects, tasks, workflows, activity, attachments, notifications, email messages and job runs, with role and staff-scope access control.
- A shadcn UI shell with a tasks table, Kanban board (pragmatic drag and drop) and Gantt timeline (SVAR).
- Cron and inbound-email routes, local seed, health checks and measurement scripts.
- A deployment of the slice to two isolated tenant environments (`staging-a`, `staging-b`) in the first tenant's Cloudflare account, measured under load and then deleted.

Result: **GO**. Worker startup was about 30ms, tenant isolation was structurally verified (separate D1 rows, bindings and sessions per tenant), and product pages ran at about 10ms CPU per request under local load with no errors.

Defects found and their fixes:

- D1 has no interactive transactions, so Payload's default adapter cannot begin one. Fixed with ordered writes and a compare-and-set on `updatedAt` (D-36, refined further in M3).
- Payload's update-by-where issues a find-then-write-by-id pair rather than one conditional statement, which can lose a concurrent write. Fixed with a single conditional write path (M1-W10).
- Concurrent sign-in by the same user could fail on a `UNIQUE constraint` in `users_sessions`, because Payload rewrites session rows outside a transaction.
- Signed-in pages tripped the Workers Free plan's 10ms CPU limit (error 1102), confirming the spec's Workers Paid requirement (§20.1).
- The first request after a deploy took about one second while Payload and Next cold-start.

Representative commits: `9cbf091` (spike foundation), `01a437a` (permissions, scope filter, changeStage, Payload access), `efcc58a` / `741fab4` (UI shell and board; mail senders, internal routes, due-soon job), `2e1e19d` (Payload email adapter), `71d5fe1` (wire spike collections, R2 storage, initial migration).

Left open: the live email round trip, deferred until Email Sending/Routing were onboarded; D1 location hints per tenant region; and the edge auth check for unauthenticated product pages, which still returned a streamed 200 instead of a 307 redirect (fixed in M3; see the `L-20260914-M3-L1-c0ffee` lesson below).

## M2: CRM

M2 combined the platform, adapter, module and UI slices for the CRM vertical into one reviewable milestone and delivered a locally demoable CRM.

What shipped:

- Organizations, contacts, leads, deals, sources, lost reasons and stage-transition history, with a Payload repository doing typed mapping and compare-and-set updates.
- Domain commands for create, update, stage movement, lost outcomes and idempotent lead conversion.
- Lead and deal tables and boards (with value totals), organization and contact tables, records, and create/edit flows.
- The shared stage, record, activity, confirmation, form and filtering UI composites that later verticals build on.

Defects found and fixed:

- Circular imports formed between seed, directory and CRM contract modules when shared types were re-exported through aggregators instead of living in a leaf module (`L-20260914-M2-L2-f94a97`). Fixed by enforcing an acyclic dependency graph with dependency-cruiser.
- Fast/subset gates could pass while the full `verify` gate (formatting, Knip, integration tests) failed later, hiding real breakage (`L-20260914-M2-W5-06a88b`). Fixed by requiring the full gate sequence at integration.
- Dropping a lead or deal card into a "lost" stage could apply the terminal state optimistically before the required lost-reason details were saved, leaving the board showing a false failure or a false terminal state on a deferred or rejected write (`L-20260914-M2-W5-68a728`). Fixed by deferring the write on a lost-stage drop and restoring the prior stage on failure.
- CRM and work reads and mutations could bypass an actor's owner/assignee/group/report scope when a related read ran before its parent record was authorized (`L-20260914-M2-W6-fb9dc8`). Fixed by keeping scope predicates in the platform policy and allowing only parent-authorized elevated reads.
- Work-package write scope drifted from the plan row: tests and support files landed outside declared scope (`L-20260914-M2-W6-96c88c`). Fixed by running `pnpm check:scope` against the plan row before reporting completion.

Representative commits: `e0264dd` (Payload CRM collections), `e8925e5` (integrate CRM domain and payload stack), `5a4d29c` / `2011e6f` (deals vertical, sample data), `880e9c2` (CRM directory vertical), `8d2683b` / `2b2f249` (dependency-cycle repairs), `d075349` (complete M2 CRM vertical), `e923981` (close CRM vertical slice).

Known limitation carried forward: Vitest's V8 coverage remapper produces nonfatal parser warnings on some TSX files and excludes them from the coverage report, even though the tests pass and the UI is exercised in the browser.

Decision at close: GO, with the explicit boundary that Cloudflare deployment, the remaining verticals, broader browser automation and production onboarding were out of scope for M2.

## M3: work, collaboration, intake/mail, tenant operations

M3 delivered the remaining five verticals as one integration wave: people/auth/onboarding/settings, work management, collaboration and product services, intake/mail/scheduled jobs, and tenant operations, plus the lead-owned integration, migration, seed and end-to-end acceptance layer.

What shipped:

- **People, auth, onboarding, settings**: invitations, inactive-user login block, last-owner protection, product-facing auth routes and pages (distinct from the Payload admin panel), onboarding, members, groups, branding, modules, terminology, workflows, fields, views, notification preferences, profile and CSV import, with every settings page enforcing role server-side.
- **Work management**: the complete work module, staff assignment rules, projects, tasks, My Tasks, dashboard, task sheet/record, project tabs, board and calendar, preserving the concurrency-safe write path from M1/M2.
- **Collaboration and product services**: comments, mentions, attachments, notifications and notification preferences, saved views and layouts, plus file, brand, unread-count and scoped-search API routes.
- **Intake, mail, jobs**: intake forms and submissions with an origin/Turnstile guard and rate limiting, a public intake API, mail templates and domain handling, record addressing, inbound quarantine/release, the `mail-router` Worker for platform-domain tenants, six scheduled jobs, and the intake/email settings pages.
- **Tenant operations**: final tenant schema and Wrangler config generation, idempotent provisioning and smoke scripts, a deploy loop with a restore point and rollback, the deploy workflow, and provisioning/deploy/rollback/incident/onboarding runbooks under `docs/runbooks/`.

Key decisions:

- The task repository maps domain stage-transition objects to Payload's flattened collection field shape rather than passing the nested domain shape through directly (see the regression below).
- Customer authentication was fixed to run entirely through the product's own `/login` surface, keeping the Payload admin panel private and out of customer navigation, formalizing an intent already implied by ADR-0001.

Defects found and fixed:

- **Task board persistence regression** (`L-20260914-M3-L1-b0a1d0`, severe): dragging a task between stages updated the task but wrote an invalid stage-transition row, because the domain command's nested `record`/`workflowId` shape didn't match Payload's flat `recordType`/`recordId`/`workflow` fields. Fixed in `packages/adapters/payload/src/repositories/task-repository.ts` by mapping the shape before writing; covered by an end-to-end smoke test.
- **Customer authentication regression** (`L-20260914-M3-L1-c0ffee`, severe): the end-to-end smoke suite and a shared work dependency still assumed the administrative Payload login, so a regression that let unauthenticated users reach product pages through the admin boundary would have passed unnoticed. Fixed by moving the smoke suite onto `/login`, asserting the product shell, and asserting no `/admin` links appear in customer navigation.
- **Incomplete DONE claims** (`L-20260914-M3-L1-a41c9e`, severe): the intake/mail vertical was reported complete on the strength of passing leaf tests, but the public intake route, intake persistence, settings screens and the mail-router Worker entry point were missing. Fixed by requiring completion review to list every acceptance-owned output path and confirm each exists.
- **Aggregate gate ordering** (`L-20260914-M3-L1-c7d2e1`, severe): remediation could start before every failed gate in a run was recorded, risking loss of which failure was actually fixed. Fixed by requiring every failed gate and its output to be recorded before remediation begins.
- **Placeholder tenant data surviving integration** (`L-20260914-M3-L1-d00d1e`, severe): settings and onboarding screens could render correctly while still showing placeholder owner, timezone, currency, host or email values instead of the confirmed tenant manifest. Fixed by making the manifest and seed the single prefill authority, checked by an executable evidence eval.
- **Settings action barrel cycle** (`L-20260923-M3-L1-e07ae8`): a shared `ActionResult` type imported through the settings action barrel while the barrel re-exported runtime actions from the same file, creating an import cycle. Fixed by moving shared action types into a leaf module.
- A collapsed desktop sidebar had no close control next to the workspace brand. Fixed by `f167940`.
- The mobile inbox folder rail overflowed a 2x2 grid. Fixed by `c778a80`.
- Settings forms left the Save button disabled with no recovery path after a rejected action. Fixed by `fac1b0b` and `bafde06`.
- Notification mark-read failures didn't preserve retry state or the originating calendar month. Fixed by `faf61c4` and `87265de`.

Representative commits: `82fa0b5` (people/auth/onboarding/settings vertical), `5382653` (work management vertical), `ffa0702` (collaboration/service vertical), `59501d8` (intake, mail, scheduled jobs), `54dca87` (tenant provisioning and deploy loop), `0a5012d` (integrate M3 customer platform surfaces), `16655fd` (inbox folder-rail controls and theme alignment).

External boundary at the end of M3: M3 provides local implementation and local verification only. No M3 evidence covers customer onboarding, production deployment, or live Cloudflare resources. M8 (onboarding the first tenant) requires the platform-operator prerequisites in spec §20.1: Workers Paid, `PLATFORM_DOMAIN` and DNS, Email Sending/Routing, a scoped Cloudflare token, GitHub deployment secrets and Turnstile widgets, plus the first tenant's owner/team data, website origins, CSV exports and branding assets. M9 (pilot fixes) requires pilot-week evidence and is limited to fixes, not new features.

## Pilot improvement pass

After M3, a pilot improvement pass exercised the product against the first tenant's local demo workspace (never production data) to close usability gaps ahead of the pilot week. Changes were scoped to what the interface could already show from known data, without inventing client facts.

What shipped:

- Task rows gained project context in the table.
- Task creation became contextual: organization-launched creation prefills the record and a suggested title.
- Notification interactions were hardened to preserve retry state and return the user to their prior calendar view.
- Task and deal board cards began showing assignee/owner names and, for deals, expected close dates, with stage-value totals refreshing after a move.
- Drag rejections (dropping outside a valid target) now leave the card in its original stage instead of silently failing.
- The task drawer's scroll behavior was fixed so its footer stays visible while content scrolls.
- The Gantt timeline's accessibility was remediated: invalid accessible names on presentation grips were removed and a keyboard-focusable named region was added.

Acceptance for this pass ran an isolated Worker-preview end-to-end and accessibility suite (45-50 passing cases across desktop and 390px mobile, depending on the run) plus a 34-route axe sweep with no serious or critical findings, including inside the Gantt timeline. A local smoke task created during persistence verification was removed afterward; no remote tenant or live client data was touched at any point.

Representative commits: `9bb10f9` (contextual task creation and links), `119e81c` / `90825c0` / `ecdcf5f` (board card ownership/close-date context), `d2bb4b5` (refresh deal totals after board moves), `ebf4686` (guard board drag cancellation), `faf61c4` / `87265de` (notification recovery and context), `8290a73` / `809cb21` (client walkthrough workspace seed).

## Harness removal and code-health pass (2026-09-25 to 2026-09-26)

The agent process harness was removed, and a first code-health pass fixed the defects and gate holes a whole-repository review had found. Verification moved from test files to curl checks against the running app, backed by a product API (ADR-0004). The open findings from that review are in [`docs/backlog/`](backlog/).

- The harness, the work-package scope check, spike scripts, orchestration docs and generated reports were deleted, about 21,600 lines. `AGENTS.md` (imported by `CLAUDE.md`), task skills in `.claude/skills/` and a hook that formats edited files replaced them (`602ad09`).
- `check:disables` now rejects a directive that names no rule. The six files that disabled lint entirely were refactored to pass it (`c76d079`).
- Provisioning wrote the tenant secrets file into the working tree and lost track of it after the next step, so the file stayed on disk. Secret files now live in a private temporary directory removed at the end of every run (`829f866`).
- The task repository's stage store discarded stage transitions. It now writes them through codecs shared with the CRM store (`3950b5e`).
- dependency-cruiser excluded every `node_modules` path, so no rule about npm packages could fire. With that fixed, it found `@ops/ui` importing `next` undeclared, and `routes-no-payload` now blocks new Payload imports in route files (`bc5ec27`).
- Duplicate search-param, initials and stage-colour helpers were replaced by shared ones, and tasks and deals render stages with `StagePill` (`32f8436`).
- Server actions returned four result shapes and sent raw exception text to the browser from 16 catch blocks. All now return `ActionResult`, and unexpected exceptions are logged and shown as generic copy (`a004a47`).
- Adding or removing a project member always failed, because guarded updates could not write has-many relationships. The API's first curl checks surfaced it (`1596662`).
- Task and project use cases are on `/api/v1`, described by a contract registry and served as JSON Schema by `GET /api/v1`. Work and CRM validation failures name each invalid field (`376bf05`).
- The first operator release of this work rolled back: the operator shell lacked `INTERNAL_SECRET_MIRCHMEDIA`, so the authenticated R2 smoke probe could not run. The smoke check now names the missing variable, and the deploy runbook lists it (`fbc7966`).
- Tests were cut to those that guard what a response or type cannot show, from 90 files and 8,615 lines to 57 files and 6,771 lines (`e41d230`).
- Release `v0.1.0` reached production on 2026-09-26 after the tenant's internal secret was rotated with `wrangler versions secret put`; health, login, R2 and email-configuration smoke checks passed, and the database was already at the newest migration.

Verification for this pass was local: static gates, unit and integration tests, the production build, and curl gates against the local dev server (`pnpm dev`) on the seeded workspace. The end-to-end suite was not run; production received the work as release `v0.1.0`.

## Lessons that shaped the codebase

- Shared cross-package contracts must live in a leaf module, never re-exported through an aggregator that other modules also import from, or the dependency graph cycles. Fixed by `8d2683b`, `2b2f249`.
- A passing subset of gates (format, lint, unit tests) does not mean the full `verify` sequence passes; formatting, Knip and integration checks must all run before a change is called complete. Enforced from M2 onward via the full `pnpm verify` gate.
- Optimistic UI updates into a terminal board state (a "lost" lead or deal) must defer the write and restore the prior stage on failure, not apply the terminal state before the write is confirmed.
- Every read and related-record read must carry the actor's scope through; a related read that runs before its parent record is authorized can leak out-of-scope records. Enforced by platform-level scope predicates and parent-authorized reads.
- The domain's stage-transition shape (nested `record`/`workflowId`) and Payload's collection field shape (flat `recordType`/`recordId`/`workflow`) are not the same thing; a repository must map between them explicitly. Fixed by `L-20260914-M3-L1-b0a1d0`.
- Customer-facing authentication and the administrative Payload panel are two different surfaces; end-to-end coverage must exercise the customer `/login` path and assert no admin links leak into customer navigation, or a regression in the customer auth boundary can pass unnoticed.
- A vertical is not done because its leaf tests pass; every acceptance-owned output (routes, persisted data, UI, Worker entry points) must be confirmed to exist.
- Confirmed tenant data (owner, timezone, currency, host, email) must flow end to end from the tenant manifest into seed, settings and onboarding; a correctly branded shell can still show placeholder regional data underneath.
- A delegated refactor can pass lint, typecheck and every test while deleting validation. Review delegated diffs against `HEAD` for removed checks and messages before committing.
- A gate can be silently inert: a bare `eslint-disable` passed `check:disables`, and an `exclude` pattern hid every npm import from dependency-cruiser. Prove a new gate fires by planting one violation before relying on it.
- Tailwind generates only class names written literally in source, so a colour class built at runtime renders nothing unless the literal also appears somewhere else.

## Known open items at the time of condensing (2026-09-25)

- The Gantt/timeline visual captures from acceptance remain local test output only, because the seeded task names in that environment are not verified client content.
- Four deal-stage mutation test cases are skipped in the current acceptance suite because the canonical seed contains no owner-provided deals; they will need real or representative deal data to exercise.
- M8 (first-tenant onboarding) has not started. It is blocked on the platform-operator prerequisites (Workers Paid, `PLATFORM_DOMAIN` and DNS, Email Sending/Routing, a scoped Cloudflare token, GitHub deployment secrets, Turnstile widgets) and on the first tenant's owner/team data, website origins, external form handler access, CSV exports and branding assets.
- M9 (pilot-week fixes) has not started. It requires evidence and a friction list from an actual pilot week, evaluated against the §20.6 pilot criteria (complete lead capture, current projects and open tasks in the app, staff login and My Tasks usage, no cross-scope visibility bugs, verified due-soon/overdue notifications).
- No M3 evidence covers production deployment or live Cloudflare resources; all verification to date is local.
