# ops-platform

A white-label CRM and project and task operations platform for service businesses. One brand-agnostic codebase is deployed as an isolated instance per customer tenant: one Cloudflare Worker, one D1 database and one R2 bucket each, with no shared rows. A neutral platform operator owns the platform and its infrastructure; customers are tenants, described by files under `tenants/`.

The authoritative specification is [`docs/spec.md`](docs/spec.md); [`docs/architecture.md`](docs/architecture.md) is the short map.

## Status

The project is in milestone M1, the spike that tests whether Payload runs well enough on Cloudflare Workers to continue (GO) or switch to the fallback stack (spec §2, D-02). The live status is [`docs/orchestration/m1/plan.md`](docs/orchestration/m1/plan.md).

In the repository today:

- Tooling, quality gates, CI and the execution harness (milestone M0).
- Payload 3 on D1 with the spike collections (users, groups, organizations, projects, tasks, workflows, activity, attachments, notifications, email messages, job runs, settings), their access rules and an initial migration.
- Platform permissions (`can`, scope filters) and the `changeStage` command; Payload repositories with compare-and-set writes.
- Product pages `/tasks` (table), `/tasks/board` (drag and drop) and `/timeline` (Gantt), all reading and writing tasks through Payload with the signed-in user access.
- A 15-minute cron dispatcher with a due-soon reminder job, an inbound email route, and outbound mail senders.
- Local seed data, local database reset, `GET /api/v1/health`, and measurement scripts for the spike report.
- Both spike tenants deployed from one build, with Worker startup times of 48 ms and 33 ms against the 1 s limit; the tenant isolation proof has passed over HTTP.

Next in M1: the lost-update fix (M1-W10) and closing the spike report, which recommends GO ([`docs/reports/m1-spike.md`](docs/reports/m1-spike.md)). The live email round trip waits for email onboarding (E-019) and signed-in page checks on Cloudflare wait for Workers Paid (E-018). Later milestones are listed in spec §21.2.

## Stack

| Component                        | Version                    |
| -------------------------------- | -------------------------- |
| Node.js                          | 22 (`.nvmrc`)              |
| pnpm                             | 10.34.5 (`packageManager`) |
| Payload (core, Next, UI, D1, R2) | 3.89.0                     |
| Next.js                          | 16.3.5                     |
| React                            | 19.3.0                     |
| @opennextjs/cloudflare           | 1.20.6                     |
| Wrangler                         | 4.131.1                    |
| TypeScript                       | 6.0.3                      |
| Tailwind CSS                     | 4.3.3                      |
| zod                              | 4.6.2                      |
| Vitest                           | 4.1.11                     |
| Playwright                       | 1.63.0                     |
| ESLint                           | 10.10.0                    |
| Prettier                         | 3.9.6                      |

UI libraries (shadcn with Base UI, TanStack Table, pragmatic drag and drop, SVAR Gantt) are pinned in `packages/ui/package.json`. The dependency allowlist is spec §4.3; a new runtime dependency needs an ADR.

## Repository layout

```text
apps/
  web/            composition root: Next.js, Payload, OpenNext and the Worker entry (worker.ts)
  mail-router/    platform-domain inbound email router Worker (not built yet)
packages/
  kernel/         @ops/kernel: domain-agnostic primitives (Result, errors, clock, logger)
  platform/       @ops/platform: domain-agnostic building blocks (permissions, workflows, ports)
  modules/        @ops/module-crm, -work, -intake, -mail: domain modules, depending on ports only
  adapters/       @ops/adapter-payload (collections, access, repositories), @ops/adapter-cloudflare (mail, cron, inbound)
  ui/             @ops/ui: vendored shadcn components and composites, no data fetching
  templates/      @ops/templates: vertical templates as typed data
scripts/          quality checks, gen-wrangler, local seed and reset, harness and spike scripts
harness/          execution harness: config, schemas, templates, attempt metrics, self-test
tenants/          one <slug>.jsonc per tenant
docs/             spec, architecture, ADRs, decisions, orchestration, reports
tooling/          shared tsconfig, ESLint rules, dependency-cruiser, knip and jscpd configs
```

Each package has a README with its Purpose and Public API. Layer rules (spec §5.2), enforced by `eslint-plugin-boundaries` and dependency-cruiser:

- `kernel` imports nothing from the workspace; `platform` imports only `kernel`.
- `modules/*` import `kernel` and `platform`, never another module, an adapter, the UI, or Payload, Next, React or Cloudflare APIs.
- `adapters/*` implement platform and module ports; only `adapters/payload` imports Payload.
- `ui` imports `kernel` types only; `apps/web` may import every package. Circular dependencies fail.

## Getting started

Prerequisites: Node.js 22 and pnpm 10.34.5. With `manage-package-manager-versions=true` in `.npmrc`, any pnpm 10 switches to the pinned version.

```sh
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

`.dev.vars` holds the local secrets and variables; the example values work for local development. The seed and reset scripts read `PAYLOAD_SECRET` from that file, but `pnpm dev` and the Payload CLI read it from the environment, so export it in the shell you run them from:

```sh
export PAYLOAD_SECRET="$(grep '^PAYLOAD_SECRET=' apps/web/.dev.vars | cut -d= -f2-)"
```

Create the local database and seed it:

```sh
pnpm db:reset:local   # deletes the local D1 state under apps/web/.wrangler and runs the migrations
pnpm seed:dev         # idempotent; safe to run again
pnpm dev              # http://localhost:3000
```

Both scripts refuse to run when `NODE_ENV=production`, `CLOUDFLARE_ENV` or `PAYLOAD_REMOTE_BINDINGS` is set.

The seed creates four users, all with the password `DevPassword123!`:

| Email                  | Role                      |
| ---------------------- | ------------------------- |
| `owner@example.test`   | owner                     |
| `manager@example.test` | manager                   |
| `staff1@example.test`  | staff (Design group)      |
| `staff2@example.test`  | staff (Development group) |

Sign in at `/admin/login`; product login pages do not exist yet, and the board and timeline redirect there without a session. Pages:

| Path             | Content                                             |
| ---------------- | --------------------------------------------------- |
| `/tasks`         | task table                                          |
| `/tasks/board`   | task board with drag and drop                       |
| `/timeline`      | Gantt timeline with date drag                       |
| `/admin`         | Payload admin                                       |
| `/api/v1/health` | `{ status, version, migration }`, no sign-in needed |

## Everyday commands

Run from the repository root.

| Command                                     | What it does                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `pnpm dev`                                  | Next.js dev server with locally emulated Cloudflare bindings                 |
| `pnpm build`                                | Next.js production build of `apps/web`                                       |
| `pnpm preview`                              | OpenNext build, then the Worker in the local workerd runtime                 |
| `pnpm verify`                               | every quality gate, tests, build and bundle size (see below)                 |
| `pnpm verify:fast`                          | format check, typecheck, lint and tests for changed files                    |
| `pnpm test`                                 | Vitest unit tests with coverage                                              |
| `pnpm test:integration`                     | Payload on a local D1 copy: scope, conflicts, duplicates (no network)        |
| `pnpm test:e2e`                             | Playwright tests under `tests/e2e`                                           |
| `pnpm typecheck`                            | `tsc --noEmit` in every workspace package                                    |
| `pnpm lint`                                 | ESLint with zero warnings allowed                                            |
| `pnpm format`                               | Prettier over the repository                                                 |
| `pnpm check:brand`                          | fails on brand or customer names in `apps/` and `packages/`                  |
| `pnpm check:vocab`                          | fails on vertical vocabulary (lead, task, project...) in kernel and platform |
| `pnpm check:disables`                       | fails on `eslint-disable` comments for gated rules                           |
| `pnpm check:docs`                           | package READMEs and TSDoc on exports                                         |
| `pnpm check:scope <WP-ID>`                  | diff against a work package's write scope and the critical paths             |
| `pnpm gen:wrangler`                         | regenerates `apps/web/wrangler.jsonc` from `tenants/*.jsonc`                 |
| `pnpm db:reset:local`                       | recreates the local D1 database from migrations                              |
| `pnpm seed:dev`                             | seeds local development data                                                 |
| `pnpm harness:plan m<N>`                    | creates or updates a milestone plan from the spec                            |
| `pnpm harness:brief <WP-ID>`                | renders a work package brief with matching lessons                           |
| `pnpm harness:record <WP-ID> --attempt <k>` | runs acceptance and gates, writes an attempt file                            |
| `pnpm harness:retro m<N>`                   | milestone retro: aggregates attempts, promotes lessons                       |
| `pnpm harness:evals`                        | runs the harness regression evals and self-test                              |

## Quality gates

`pnpm verify` runs, in order: `format:check`, `typecheck`, `lint`, `depcruise`, `knip`, `jscpd`, `check:brand`, `check:vocab`, `check:disables`, `check:docs`, `harness:evals`, `test`, `build` and `size`. CI runs it on every pull request and push to `main`.

Key limits (spec §6):

- TypeScript strict with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; no `any`, non-null assertions or enums.
- Cyclomatic complexity 8, cognitive complexity 10, nesting depth 3.
- Function length 40 lines in `.ts` and 80 in `.tsx`; file length 250 lines.
- Gated rules are never disabled inline (`check:disables`).
- No brand or customer names in code (`check:brand`); no vertical vocabulary in kernel and platform (`check:vocab`).
- `knip` reports zero unused files, exports or dependencies; `jscpd` duplication at most 2%.

## Tenants and deployment

A tenant is one zod-validated file, `tenants/<slug>.jsonc` (spec §19.1): host, template, timezone, locale, currency, owner, email settings, D1 database, R2 bucket, rate-limit namespaces and deploy order. The spike tenants are `staging-a` and `staging-b`.

`pnpm gen:wrangler` writes `apps/web/wrangler.jsonc`. Do not edit that file. Its top level is the local development Worker (`ops-dev`) with local-only bindings, and it holds one `env.<slug>` per tenant with that tenant's own D1, R2, rate limiters, variables and cron trigger. The generator fails when two tenants share a database, bucket or namespace.

Builds and local runs never contact Cloudflare (E-006). Remote operations need Cloudflare credentials and are run only by the lead or the platform operator:

- remote migrations: `PAYLOAD_REMOTE_BINDINGS=1 CLOUDFLARE_ENV=<slug>` with the Payload CLI in `apps/web`;
- deploys: `opennextjs-cloudflare deploy --env <slug>` from an existing build;
- secrets: `wrangler secret bulk <file> --env <slug>`.

The one-command provisioning, deploy loop and runbooks are milestone M7 (spec §19.3, §19.4).

## Working on this repository

Work follows the spec in milestones, each split into work packages (spec §0, §21):

- A lead plans each milestone in `docs/orchestration/m<N>/plan.md`, dispatches work packages to workers with a brief, reviews, and merges. Workers stay inside the brief's write scope and report in `docs/orchestration/m<N>/reports/`.
- Execution decisions are recorded in `docs/decisions/decision-register.md` (E-nnn), open questions in `docs/decisions/open-questions.md`, and architecture decisions in `docs/adr/`.
- The harness (`harness/`, `scripts/harness/`, spec §26) records attempt metrics, classifies failures, and turns repeated failures into lessons with regression evals that later briefs include.

Conventions:

- Conventional Commits, for example `feat(crm): ...` or `docs: ...`.
- Comments stay short: a one-line TSDoc on exported symbols, inline comments only to explain why. No commented-out code.
- Documentation describes current behavior only; link to the owning document instead of duplicating it.

## License

`UNLICENSED`: proprietary, all rights reserved. The license decision is open and tracked as Q-001 in [`docs/decisions/open-questions.md`](docs/decisions/open-questions.md).
