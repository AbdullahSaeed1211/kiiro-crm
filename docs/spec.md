# Ops Platform — One-Shot Agent Execution Spec

> This document is the complete, self-sufficient build specification. A lead orchestrator agent and its worker agents build the product
> end to end from this document and the repository alone. All versions and platform facts were verified against npm and official docs on
> 13 September 2026.

## Context
Service businesses (legal, home inspection, health, accounting, real estate, travel, education, hospitality, agencies) typically run leads and client work
through email inboxes and Google Sheets with no system of record. We are building a **white-label CRM + project/task operations platform**, owned and run by a
neutral **platform operator**: one shared codebase, deployed as an **isolated instance per customer tenant** on Cloudflare (Worker + D1 + R2 + Email).
Customers are tenants and never own platform infrastructure. The first customer is Mirch Media (a web agency whose portfolio spans these verticals); LMPM is the second. The code must be domain-agnostic at its core,
brand-free, strictly clean (complexity-gated), documented, and free of bloat.

---

## 0. Orchestration protocol
The protocol protects the build from serious mistakes (broken contracts, security gaps, tenant leaks, data loss, architecture drift). It does not turn ordinary implementation choices into formal process.

### 0.1 Roles and source of truth
**Lead orchestrator (the lead):** owns the outcome. Plans each milestone, writes contracts, assigns work packages (WPs), reviews and integrates results, runs deployment checks, and makes acceptance and GO/FALLBACK decisions.
**Worker:** an agent session or engineer executing one WP from a brief. Workers make ordinary implementation choices inside their scope (naming, internal structure, helper functions, test layout) and note meaningful ones in their report. There is no worker-to-worker coordination; shared questions go through the lead.
**Source of truth, in order:** accepted ADRs (they amend the spec sections they name) → this spec (committed as `docs/spec.md`, updated in the same PR as any ADR that amends it) → decision register → tests → repository state. Chat history and tool memory are never authoritative.
The protocol is tool-agnostic: "agent" means any capable coding agent or human.

### 0.2 Ownership
**Lead-owned:** architecture; authorization and permissions; security-sensitive behavior; database consistency and transaction semantics; tenant isolation; domain-model decisions; migration strategy (only the lead generates migrations);
contracts between workstreams; dependency changes; integration between workstreams; final review; milestone acceptance; GO/FALLBACK decision.
**Delegable:** research; schema implementation against contracts; UI composites and pages; tests; fixtures and seed data; scripts outside tenant-isolation logic; lint/type fixes; isolated integrations; CRUD; measurement collection.
The §21.3 tables assign owners. The lead may execute any WP itself.

### 0.3 Escalation to the human owner
Only for: missing credentials or account access; an unavailable external service; destructive or irreversible actions (production data changes, data restores, DNS changes on client zones, deleting cloud resources);
a contradiction inside this spec; a platform limitation that changes the architecture (including a FALLBACK result); copying non-permissive source; relaxing a quality gate; unprovable tenant isolation.

### 0.4 Decide and record
Choices this spec does not dictate: the lead or worker picks the simplest option consistent with the architecture and proceeds. Choices that affect other workstreams, public contracts, data shape, security or tenancy go to the lead,
who records them in `docs/decisions/decision-register.md` (ID, decision, rationale, date). Workers return `BLOCKED` only when a choice falls in that list or the brief is contradictory.

### 0.5 Work package brief
Every WP brief contains: **Objective** · **Spec references** · **Write scope** (where the work is expected to land) · **Inputs** (contracts and merged WPs) · **Acceptance** (commands and expected results) ·
**Boundaries** (§0.7 critical paths untouched; no dependency or migration changes; §3 constraints) · **Report** (`docs/orchestration/m<N>/reports/<WP-ID>.md`, §0.6).
Rendered by `pnpm harness:brief <WP-ID>` from `harness/templates/brief.md`: the §21.3 row, spec references, inputs and **Known pitfalls** from active lessons (§26.6). Wording beyond these fields is free-form.

### 0.6 Worker report
`WP` · `Status: DONE | BLOCKED` · files changed · acceptance evidence (deciding output lines) · tests added · notable implementation choices · open questions or dependency requests.
Reports carry JSON front matter validated by `harness/schemas/report.schema.json`; workers run `pnpm harness:record <WP-ID> --attempt <k>` before reporting.
For a retry, the report also maps each lead finding to its failure class, countermeasure, test or check, and remediation commit. A green gate does not erase a review finding.

### 0.7 Critical paths
Only the lead changes these paths; `pnpm check:scope <WP-ID>` fails a WP that touches them. Changes outside a WP's expected write scope are flagged for review, not auto-failed.
```text
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
eslint.config.js
vitest.config.ts
playwright.config.ts
tooling/
harness/config.yaml
harness/schemas/
harness/templates/
harness/lessons/
harness/evals/
docs/spec.md
docs/decisions/
docs/adr/
docs/orchestration/m0/plan.md
docs/orchestration/m1/plan.md
tenants/
.github/workflows/deploy.yml
scripts/gen-wrangler.ts
scripts/lib/tenant-schema.ts
apps/mail-router/
apps/web/package.json
apps/web/worker.ts
apps/web/wrangler.jsonc
apps/web/src/payload.config.ts
apps/web/src/migrations/
apps/web/src/proxy.ts
apps/web/src/server/session.ts
packages/kernel/src/contracts/
packages/platform/src/contracts/
packages/platform/src/permissions/
packages/modules/crm/src/ports/
packages/modules/work/src/ports/
packages/modules/intake/src/ports/
packages/modules/mail/src/ports/
packages/adapters/payload/src/contracts/
packages/adapters/payload/src/access/
packages/adapters/payload/src/uow/
packages/adapters/cloudflare/src/contracts/
packages/ui/src/contracts/
```
Each WP's own attempt files `harness/metrics/attempts/<WP-ID>-a<k>.json` are always in its scope. Each milestone's plan (`docs/orchestration/m<N>/plan.md`) is lead-owned; worker reports under `docs/orchestration/m<N>/reports/` are written by workers.

### 0.8 Execution loop
1. **Plan:** the lead copies the §21.3 table into `docs/orchestration/m<N>/plan.md`, adjusting it to the actual repository state (splits, merges, re-ordering) with a one-line reason per change.
2. **Contracts:** wave-0 Lead WPs merge before workers start.
3. **Dispatch:** WPs run as soon as their dependencies are merged, up to available concurrency (§0.11); parallel WPs must have non-overlapping write scopes.
4. **Execute:** each WP works on branch `wp/<WP-ID>` from the milestone branch and writes its report. When the branch is clean, the evidence and report are committed, and the WP is DONE or BLOCKED, the worker sends one completion notification to the lead and stops.
5. **Review:** only after that notification, the lead re-runs `pnpm harness:record <WP-ID>` (acceptance, `verify:fast`, scope), reads the diff, and checks for duplicate abstractions, authorization gaps and tenant-specific code.
6. **Merge:** verified WPs merge into the milestone branch; the lead runs the full `pnpm verify` after each wave (per-WP checks are the fast subset, §6.6). After integrated verification passes, the lead removes the merged worker worktree and deletes its local branch.
7. **Retry:** a failed WP gets one more attempt with the lead's findings written into the retry brief. Every post-review remediation and every `fix(...)` commit is a harness failure signal, including when all automated gates were green. The retry uses the next append-only attempt number and confirms the root-cause classes. After the retry budget, the lead finishes the WP or re-plans.
8. **Accept:** the lead runs the §21.2 row and required runtime checks, writes `docs/reports/m<N>.md`, runs `pnpm harness:retro m<N>` and completes promoted lessons and evals (§26.8), and merges to `main`.
**Status and resume:** `docs/orchestration/m<N>/plan.md` carries a status column (`planned | dispatched | review | merged | done-by-lead`) updated by the lead at each transition, so any new lead session resumes from the repository.

**Completion signaling:** workers own progress and completion reporting. The runtime resumes the lead through a worker return, callback, completion event, or equivalent push notification. The lead does not repeatedly wait for status, list or read worker conversations, or inspect an active worker's branch or worktree to infer progress. If the runtime cannot push completion, the worker runs synchronously to completion. While workers run, the lead may perform independent work on the milestone branch that does not inspect, modify, or merge their active work.

### 0.9 Spike report template (`docs/reports/m1-spike.md`)
```text
What was implemented
What worked
What failed
Tests performed
Runtime measurements            (bundle size, startup_time_ms vs 1 s limit, cold first-request latency, warm p50/p95 per route, CPU time p50/p99, D1 rows read/written, R2 operations, peak memory on largest upload)
Database / migration findings   (migration behavior, idType uuid result, transaction/atomicity result → D-36)
Security / permission findings  (route blocking works on the deployed Worker, scope queries across relationships)
Tenant-isolation findings       (§19.5 proof)
Known risks
Changes made from the original plan and why
GO or FALLBACK                  (one word, then the evidence it rests on)
Recommended next action
```

### 0.10 Milestone completion
Complete when: its WPs are merged and reviewed; the §21.2 acceptance row passes with evidence; authorization is tested; required runtime checks pass on the real target; measurements are captured where required; risks are documented.
The next milestone starts only after this gate. After M1, the lead re-plans M2–M9 from the spike results (§21.3 tables are provisional until the M1 spike report).


### 0.11 Operating assumptions (runtime-agnostic)
- **Concurrency:** use as many parallel workers as the runtime supports, capped at 6 (`harness/config.yaml`); a runtime without subagents runs WPs sequentially in dependency order with the same briefs, reports and gates.
- **Credentials stay with the lead:** workers implement and test locally (local D1/R2 emulation, fixtures, Turnstile test keys, console mailer). Every authenticated Cloudflare, GitHub, DNS or email operation (`wrangler deploy`, `d1 create`, `secret bulk`, remote migrations, dashboard steps) is performed by the lead. Workers never receive tokens or secrets.
- **Isolation:** every concurrent worker has its own branch and worktree (for example `git worktree add ../wt/<WP-ID> -b wp/<WP-ID> m<N>-<slug>`) or equivalent filesystem isolation; no two workers share a working copy.
- **Resume rule:** on any restart the lead reads `docs/orchestration/m<N>/plan.md` (status column), `git log` and branches (`m<N>-*`, `wp/*`), merged WPs, `docs/orchestration/m<N>/reports/`, `harness/metrics/attempts/` and acceptance evidence in `docs/reports/`, reconciles plan status with Git reality, and continues from the first unfinished WP in dependency order.
- **Preflight (start of every session):** verify Node 22 and pnpm 10.34.5, Git clean state, `pnpm install --frozen-lockfile`, reference repositories present (§0.14), `wrangler whoami` and account access (lead only), GitHub access, and required secrets/prerequisites for the current milestone (§20.1 for M8). Missing items that block the milestone trigger §0.3; others are recorded and work continues.

### 0.12 Kickoff instruction
```text
Act as the lead orchestrator defined in docs/spec.md. Inspect the repository, run an environment and credential preflight,
execute milestones in order, delegate eligible work packages to isolated subagents up to available concurrency,
independently verify every result, and persist all decisions and progress in the repository.
Continue autonomously unless an escalation condition in §0.3 occurs.
```

### 0.13 Human involvement
The build runs autonomously except for: Cloudflare account and product activation (Workers Paid, Email Service onboarding); DNS and Email Routing dashboard steps; production-destructive or data-restore actions;
customer owner and team information; access to external repositories (e.g. `mirchmedia-laravel`); CSV exports of existing client data; registering `PLATFORM_DOMAIN`. The lead batches these requests at the milestone where they are first needed.

### 0.14 Reference repositories
Behavior references are cloned read-only next to the product repository, never inside it, so they are never committed, linted, scanned by `check:brand` or imported.
```text
crm/                         workspace: /Users/abdullahsaeed/freelance/mirchmedia-projects/crm
├─ ops-platform/             the product repository (this spec)
└─ references/               study-only clones (§3 constraint 1: read, never copy)
```
```bash
mkdir -p /Users/abdullahsaeed/freelance/mirchmedia-projects/crm/references && cd /Users/abdullahsaeed/freelance/mirchmedia-projects/crm/references
git clone --depth 1 https://github.com/frappe/crm.git frappe-crm                 # AGPL-3.0: behavior reference
git clone --depth 1 https://github.com/twentyhq/twenty.git twenty                 # AGPL + Enterprise files: never open files marked Enterprise for reuse
git clone --depth 1 https://github.com/hcengineering/platform.git huly            # EPL-2.0: behavior reference
git clone --depth 1 https://github.com/makeplane/plane.git plane                  # AGPL-3.0: behavior reference
git clone --depth 1 https://github.com/cortezaproject/corteza.git corteza         # Apache-2.0: patterns may be reused with notice
git clone --depth 1 https://github.com/payloadcms/payload.git payload             # MIT: foundation source and templates/with-cloudflare-d1
git clone --depth 1 --filter=blob:none --sparse https://github.com/odoo/odoo.git odoo && git -C odoo sparse-checkout set addons/crm addons/project   # LGPL/GPL mix: process reference only
```
`references/README.md` (written by the lead) lists each clone's commit, license and allowed use. Workers may read references listed in their brief; any code reuse beyond permissive licenses triggers §0.3.

---

## 1. Goals / non-goals
**Goals:** replace spreadsheets, email inboxes and paid seat-based tools for service businesses; isolated per-client deploys;
runtime white-label; lead intake from existing websites; inbound + outbound email on records; strict code quality.
**Non-goals:** shared-row multitenancy (never without ADR); client portal (Phase 4); billing/invoicing (never in core); native apps
(never, responsive web only); runtime custom entity types (Phase 4+); telephony/WhatsApp (Phase 4); clinical/medical records (never without privacy ADR).

---

## 2. Decision register (defaults; override only via ADR)
| ID | Decision | Value |
|---|---|---|
| D-01 | Foundation | Payload 3 + Next.js 16 via OpenNext on Cloudflare Workers; D1; R2 |
| D-02 | Fallback (only on spike FALLBACK) | Vite React SPA + Hono + Better Auth + Drizzle on D1/R2 (versions pinned at fallback time, same gates) |
| D-03 | Tenancy | One Worker + one D1 + one R2 bucket + one settings global per tenant. No shared rows |
| D-04 | Repo codename / package scope | Repo `ops-platform`; workspace scope `@ops/*` (private, never published). No brand in code |
| D-05 | Default product name when `settings.appName` is empty | `Workspace` |
| D-06 | Platform domain | Neutral domain owned by the platform operator on Cloudflare DNS, placeholder `PLATFORM_DOMAIN` until registered (PLATFORM_DOMAIN registered by the platform operator is a Phase 1 prerequisite, §20.1); default tenant host `<slug>.<PLATFORM_DOMAIN>`. **Must not contain any customer name** |
| D-07 | Tenant hosting | Every tenant, including the first customer (`mirchmedia`), is platform-hosted at `<slug>.<PLATFORM_DOMAIN>` in the platform operator's Cloudflare account; customer-owned domains follow D-49 |
| D-08 | IDs | Payload-generated UUID strings (`idType: 'uuid'`; documented values are `'number' \| 'uuid'`; the UUID version is adapter-defined, so code never relies on id ordering). Non-persisted ids (events, idempotency) use `crypto.randomUUID()` |
| D-09 | Time | Domain timestamps stored as UTC epoch ms integers; displayed in the tenant timezone via `@date-fns/tz` |
| D-10 | Money | Integer minor units + ISO 4217 code |
| D-11 | Data fetching | React Server Components for reads; Server Actions for mutations; React `useOptimistic` for board and inline edits. **No TanStack Query** |
| D-12 | Forms | React 19 `useActionState` + shared zod schemas. **No react-hook-form** |
| D-13 | URL state | `nuqs` |
| D-14 | Tables | TanStack Table v9 (`useTable` + `tableFeatures`, as in the shadcn data-table guide) |
| D-15 | Drag and drop | `@atlaskit/pragmatic-drag-and-drop` + hitbox (Apache-2.0) |
| D-16 | Gantt | `@svar-ui/react-gantt` MIT edition only; no PRO features |
| D-17 | UI kit | shadcn CLI 4.21.0, Base UI primitives (default), base color `neutral`, Tailwind 4, `lucide-react` icons |
| D-18 | Fonts | Geist + Geist Mono via `next/font/google` (self-hosted at build) |
| D-19 | Theme | `next-themes`, default `system`, light/dark |
| D-20 | i18n | `next-intl`; Phase 1 ships `en` only; other locale catalogs (e.g. `es`) are added when a tenant needs them (D-48); terminology overrides are message variables |
| D-21 | Charts | None; dashboard uses CSS bars |
| D-22 | Rich text | Phases 1–2: plain text with a markdown-lite renderer (bold, italic, links, lists; own ≤ 80-line renderer that escapes HTML); Phase 3 ADR for rich text |
| D-23 | Outbound email | Cloudflare Email Service `send_email` binding behind `MailSender` port; Resend via plain `fetch` as fallback (`MAIL_TRANSPORT=resend`); `ConsoleMailSender` in development |
| D-24 | Inbound email | Cloudflare Email Routing → Worker `email()` handler → internal route → `mail` module; parsed with `postal-mime` (§14.4) |
| D-25 | Email templates | Pure TS functions returning `{ subject, html, text }`; no React Email |
| D-26 | Cron | One trigger per tenant Worker `*/15 * * * *`; a dispatcher picks due jobs by time window; idempotent `jobRuns` |
| D-27 | Roles | `owner`, `manager`, `staff` (§9.10) |
| D-28 | Stage categories | `backlog \| open \| active \| waiting \| done_success \| done_failure \| cancelled` |
| D-29 | Board ordering | Fractional-index `rank` strings from `@ops/kernel` (no dependency), ordered by `(rank, id)`; moves write only the moved record; rebalancing is a separate conditional operation (§8) |
| D-30 | Our code's license | **Open (Q-001, non-blocking)**: `UNLICENSED` (proprietary) until ADR-0003 |
| D-31 | Package manager / runtime | pnpm 10.34.5 (`packageManager: "pnpm@10.34.5"`), Node 22 LTS |
| D-32 | Monorepo tooling | pnpm workspaces only. **No Turborepo/Nx** |
| D-33 | Stalled threshold | 14 days without a stage change |
| D-34 | Page size | 50 rows, server pagination |
| D-35 | Notification poll | Unread count every 60 s |
| D-36 | Unit of work on D1 | **Filled by M1**: Payload DB transaction if the spike proves it; else ordered writes with idempotency keys |
| D-37 | Invitations | invitation expiry default 7 days; token 32 random bytes, stored as SHA-256 hash |
| D-38 | Sessions & lockout | Payload `tokenExpiration` 604800 s (7 days), `maxLoginAttempts` 5, `lockTime` 600000 ms, cookies `Secure; HttpOnly; SameSite=Lax` |
| D-39 | Timezone | tenant timezone only (no per-user timezone in Phase 1) |
| D-40 | Inbound routing | Custom-domain tenants: Email Routing subdomain `in.<host>` → tenant Worker. Platform-domain tenants: shared `in.<PLATFORM_DOMAIN>` → `ops-mail-router` Worker (zone limit: 30 Email Routing + Sending domains per zone) |
| D-41 | Platform sender | Single onboarded sending subdomain `notify.<PLATFORM_DOMAIN>`, address `no-reply@notify.<PLATFORM_DOMAIN>` |
| D-42 | Rate limiting | Workers `ratelimits` bindings (permissive, per location) + Payload lockout + Turnstile + dedupe |
| D-43 | Mobile board | Drag disabled on coarse pointers and below `md`; stage change via card menu |
| D-44 | Search | Case-insensitive `LIKE` per record type (§12.2); FTS5 deferred to a Phase 3 ADR |
| D-45 | Import | `@payloadcms/plugin-import-export` in Payload admin (synchronous mode); no custom CSV parser |
| D-46 | Password policy | 12–128 characters, must not equal the email; enforced on every set-password path (§12) |
| D-47 | Event delivery | In-process `EventBus` after commit with error logging; missed side effects are repaired by idempotent reconciliation jobs (e.g. notifications derived from recent activity); no durable outbox unless dropped events are observed in production |
| D-48 | Generality | Phase 1 builds for the first customer (Mirch Media, an agency): `agency` template and English only. Other templates (§18.2) and locales are built when a client needs them; generality is added where client number two proves it necessary |
| D-49 | Custom tenant domains | Phase 2, when a customer asks: Cloudflare for SaaS custom hostnames on the `PLATFORM_DOMAIN` zone (100 included, then $0.10 each); the customer CNAMEs its hostname to `tenants.<PLATFORM_DOMAIN>`; an `ops-edge-router` Worker on route `*/*` forwards by `request.cf.hostMetadata.slug` to the tenant Worker through a service binding; email still uses the platform sender with the tenant display name |
| D-50 | Platform operator | Owns the Cloudflare account, GitHub organization, `PLATFORM_DOMAIN`, Email Service domains and all secrets. Customers are tenants: their owners and managers are users inside their own instance and never receive platform credentials |

---

## 3. Hard constraints
1. **License hygiene:** Twenty, Frappe CRM, Plane, Huly are behavior references only. No copying or translating their source. Dependencies must be MIT/Apache-2.0/BSD/ISC.
2. **Brand-free code:** the tokens `mirch`, `frappe`, `twenty`, `plane`, `huly`, and any client name must not appear in `packages/**` or `apps/**` (code, UI copy, tests). UI copy must not say "Payload". Allowed only in `tenants/**` and `docs/**`. Enforced by `pnpm check:brand`.
3. **Domain-agnostic core:** `@ops/kernel` and `@ops/platform` contain no CRM/project/vertical vocabulary (lead, deal, contact, organization, project, task, matter, inspection, patient, booking…). Enforced by `pnpm check:vocab`.
4. **Vendor-agnostic domain:** modules depend on ports only; never on Payload, Next, React, Cloudflare or D1 APIs (§5.2).
5. **Complexity gates** (§6.2) are never relaxed inline; disabling a gated rule fails CI.
6. **No bloat:** dependency allowlist (§4.3); a new runtime dependency requires an ADR with size and need; `knip` zero findings; `jscpd` ≤ 2%.
7. **Documentation** per §7 is part of the Definition of Done.
8. **Server-side authorization** on every read and mutation; UI gating is presentation only.
9. **Idempotency** for every job, intake submission, inbound email and retryable domain command.

---

## 4. Toolchain & pinned versions (verified 13 Sep 2026)

### 4.1 Runtime / framework
| Package | Version | Compatibility evidence |
|---|---|---|
| node | 22 LTS | `.nvmrc` = `22` |
| pnpm | 10.34.5 | `packageManager: "pnpm@10.34.5"`; activated with corepack |
| payload, @payloadcms/next, @payloadcms/ui, @payloadcms/db-d1-sqlite, @payloadcms/storage-r2, @payloadcms/plugin-import-export | 3.89.0 | `@payloadcms/next` peer next `>=16.2.6 <17.0.0` |
| next | 16.3.5 | `@opennextjs/cloudflare` peer next `>=16.3.3` |
| react, react-dom | 19.3.0 | next peer `^19.0.0` |
| @opennextjs/cloudflare | 1.20.6 | peer wrangler `^4.125.0` |
| wrangler | 4.131.1 | |
| typescript | **6.0.3** | typescript-eslint 8.70.0 peer `>=4.8.4 <6.1.0`; **never TypeScript 7.x** |
| graphql | ^16.8.1 | Payload peer only; GraphQL disabled |

### 4.2 UI / app libraries
| Package | Version |
|---|---|
| shadcn (CLI) | 4.21.0 |
| @base-ui/react | 1.8.0 (added by shadcn) |
| tailwindcss | 4.3.3 |
| lucide-react | 1.45.0 |
| @tanstack/react-table | 9.2.4 |
| @atlaskit/pragmatic-drag-and-drop | 3.1.0 |
| @atlaskit/pragmatic-drag-and-drop-hitbox | 2.2.0 |
| @svar-ui/react-gantt | 2.7.3 (MIT; peer react `>=18`) |
| cmdk | 1.1.1 (added by shadcn command) |
| sonner | 2.0.8 (added by shadcn) |
| next-themes | 0.4.6 |
| next-intl | 4.14.4 |
| nuqs | 2.10.1 |
| zod | 4.6.2 |
| date-fns | 4.4.0 |
| @date-fns/tz | 1.5.0 |
| postal-mime | 3.0.0 |

### 4.3 Dependency allowlist
Runtime: everything in §4.1 and §4.2, plus internals added by the shadcn CLI (`class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, Base UI/cmdk/sonner).
**Banned without ADR:** state managers (redux/zustand/jotai), TanStack Query, react-hook-form, axios, lodash, moment, chart libraries, CSS-in-JS, other UI kits, ORMs beyond Payload's, Turborepo/Nx, React Email, `@payloadcms/email-resend` (fetch adapter instead), `@vercel/og`/`ImageResponse` (bundle weight), CSV parsers, faker, msw, `@testing-library/*`, jsdom/happy-dom.

### 4.4 Dev tooling
| Package | Version |
|---|---|
| eslint | 10.10.0 |
| typescript-eslint | 8.70.0 |
| eslint-plugin-sonarjs | 4.2.0 |
| eslint-plugin-boundaries | 7.2.0 (rule `boundaries/dependencies`, settings `boundaries/elements`) |
| dependency-cruiser | 18.2.0 |
| knip | 6.35.1 |
| jscpd | 5.2.0 |
| prettier | 3.9.6 |
| vitest, @vitest/coverage-v8 | 4.1.11 (`@cloudflare/vitest-pool-workers@0.22.0` peer vitest `^4.1.0`; vitest 5 is incompatible) |
| @cloudflare/vitest-pool-workers | 0.22.0 |
| @playwright/test | 1.63.0 |
| @axe-core/playwright | 4.13.0 |
| @cloudflare/workers-types | 5.20260911.1 |
| @types/react | 19.3.0 |
| @types/node | 22.20.2 |
| tsx | 4.23.13 |
Install with exact versions only (`pnpm add -E`). `.npmrc`: `save-exact=true`, `strict-peer-dependencies=true`, `auto-install-peers=false`.

---

## 5. Repository layout & architecture

### 5.1 Tree
```
ops-platform/
├─ apps/
│  ├─ web/                          # composition root ONLY: Next.js + Payload + OpenNext + Worker entry
│  │  ├─ worker.ts                  # fetch (OpenNext) + scheduled + email handlers (§13)
│  │  ├─ wrangler.jsonc             # generated by scripts/gen-wrangler.ts (§19.2)
│  │  ├─ open-next.config.ts
│  │  ├─ next.config.ts
│  │  ├─ .dev.vars.example
│  │  └─ src/
│  │     ├─ payload.config.ts       # assembles collections from @ops/adapter-payload
│  │     ├─ payload-types.ts        # generated
│  │     ├─ migrations/             # generated by payload migrate:create
│  │     ├─ proxy.ts                # security headers + blocked Payload auth routes (§12)
│  │     ├─ app/
│  │     │  ├─ (auth)/login | forgot-password | reset-password | invite/[token]
│  │     │  ├─ (app)/layout.tsx     # AppShell + brand tokens
│  │     │  ├─ (app)/…              # routes in §17
│  │     │  ├─ (payload)/admin/[[...segments]]
│  │     │  └─ api/v1/…             # route handlers in §12
│  │     ├─ server/
│  │     │  ├─ container.ts         # wires ports → adapters per request
│  │     │  ├─ session.ts           # current actor from Payload auth
│  │     │  ├─ actions/<module>/<command>.ts
│  │     │  └─ queries/<module>/<query>.ts
│  │     ├─ i18n/{request.ts, messages/en.json, messages/es.json}
│  │     └─ styles/globals.css
│  └─ mail-router/                  # platform-domain inbound email router Worker (§14.4); plain Worker, one file ≤ 60 lines
├─ packages/
│  ├─ kernel/        @ops/kernel               # §8
│  ├─ platform/      @ops/platform             # §9 domain-agnostic building blocks
│  ├─ modules/
│  │  ├─ crm/        @ops/module-crm           # §10.1
│  │  ├─ work/       @ops/module-work          # §10.2
│  │  ├─ intake/     @ops/module-intake        # §10.3
│  │  └─ mail/       @ops/module-mail          # §10.4
│  ├─ adapters/
│  │  ├─ payload/    @ops/adapter-payload      # §11 collections, repositories, access, hooks
│  │  └─ cloudflare/ @ops/adapter-cloudflare   # Email Service, Turnstile, rate limits, R2 streams, cron + inbound bridges
│  ├─ ui/            @ops/ui                   # §15 shadcn (vendored under src/components/ui) + composites
│  └─ templates/     @ops/templates            # §18
├─ tenants/<slug>.jsonc                        # §19.1 (only place client names may appear besides docs)
├─ scripts/  provision-tenant.ts  deploy-tenants.ts  smoke-tenant.ts  gen-wrangler.ts  seed-dev.ts  reset-local-db.ts
│            check-brand.ts  check-vocab.ts  check-disables.ts  check-docs.ts  check-size.ts  check-scope.ts  harness/
├─ harness/   control plane: config, schemas, templates, metrics, lessons, evals (§26.2)
├─ tooling/  tsconfig/base.json  eslint/rules.js  depcruise/.dependency-cruiser.cjs  knip/knip.json  jscpd/.jscpd.json
├─ docs/     (§7)
├─ eslint.config.js  vitest.config.ts  playwright.config.ts  pnpm-workspace.yaml  package.json  .npmrc  .nvmrc  .prettierrc.json
└─ .github/workflows/  ci.yml  deploy.yml
```

### 5.2 Layer rules (eslint-plugin-boundaries + dependency-cruiser, both enforced)
| Layer | May import | Must not import |
|---|---|---|
| kernel | zod | every other workspace package |
| platform | kernel | modules, adapters, ui, templates, apps; payload, next, react, cloudflare APIs |
| modules/* | kernel, platform | other modules, adapters, ui, apps; payload, next, react, cloudflare APIs |
| adapters/payload | kernel, platform, modules, payload | ui, apps |
| adapters/cloudflare | kernel, platform, modules | payload, ui, apps |
| ui | kernel (type-only), react, shadcn dependencies | platform/modules/adapters at runtime, payload |
| templates | kernel, platform (types and zod schemas) | modules runtime, adapters, ui |
| apps/web | all packages | — |
| apps/mail-router | nothing (Workers runtime only) | everything |
Cross-module interaction only via platform `DomainEvent`s or platform ports. Circular dependencies fail CI.

### 5.3 Module anatomy (identical for every module)
```
src/
  domain/     entities, value objects, invariants and validators (pure)
  commands/   one file per use case; export execute(deps, input): Promise<Result<Output, DomainError>>
  queries/    read-model specs (pure builders of FilterNode/SortSpec)
  ports/      interfaces required by the module
  events/     emitted event types
  schema/     zod input schemas (shared with Server Actions)
  index.ts    public API; every export documented in README
test/         unit tests mirroring src/
README.md     §7.3
```

---

## 6. Code quality gates

### 6.1 TypeScript
`tooling/tsconfig/base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2023", "lib": ["ES2023", "DOM"], "module": "ESNext", "moduleResolution": "bundler",
    "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true, "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true, "useUnknownInCatchVariables": true, "verbatimModuleSyntax": true,
    "isolatedModules": true, "skipLibCheck": true, "declaration": false, "noEmit": true, "jsx": "preserve"
  }
}
```
No `any`, no non-null `!`, no `enum` (use `as const`), no default exports except files that Next/Payload/Workers require.

### 6.2 ESLint gated rules
| Rule | `.ts` | `.tsx` |
|---|---|---|
| `complexity` (cyclomatic) | 8 | 8 |
| `sonarjs/cognitive-complexity` | 10 | 10 |
| `max-depth` | 3 | 3 |
| `max-params` | 3 | 2 |
| `max-lines-per-function` (skip blank + comments) | 40 | 80 |
| `max-lines` (skip blank + comments) | 250 | 250 |
| `max-nested-callbacks` | 3 | 3 |
| `max-statements` | 15 | 20 |
| `no-else-return`, `no-nested-ternary`, `eqeqeq`, `prefer-const` | error | error |
| `@typescript-eslint/no-explicit-any`, `no-non-null-assertion`, `switch-exhaustiveness-check`, `no-floating-promises`, `consistent-type-imports` | error | error |
| `sonarjs/no-duplicate-string` (threshold 4), `sonarjs/no-identical-functions` | error | error |
Only exception: `packages/adapters/payload/src/collections/**` may have `max-lines` 300 (declarative configs). The vendored shadcn directory `packages/ui/src/components/ui/**` is excluded from gated rules, `jscpd` and `knip` exports, and may only change per §15.1.

### 6.3 Architecture
dependency-cruiser rules mirror §5.2 plus `no-circular`, `no-orphans` (except entry files), `not-to-dev-dep` from runtime code.

### 6.4 Dead code & duplication
`knip`: zero unused files, exports and dependencies. `jscpd`: threshold 2%, min tokens 60.

### 6.5 Custom checks (each script ≤ 80 lines, unit-tested)
- `check:brand`: case-insensitive forbidden tokens (§3, constraint 2) outside `tenants/**`, `docs/**`, `scripts/check-brand.ts`; also runs on `apps/web/.open-next/**` build output in CI.
- `check:vocab`: forbidden vertical vocabulary in `packages/kernel/**` and `packages/platform/**`.
- `check:disables`: fails on `eslint-disable` comments naming a gated rule.
- `check:docs`: every package has a README with Purpose and Public API sections; exported functions of `kernel`, `platform` and `modules/*` have TSDoc.
- `check:size`: records the OpenNext Worker bundle size in `docs/reports/size.json`; fails on > 20% growth versus `main` without an ADR reference in the PR.

### 6.6 `pnpm verify` (full, run by the lead after each wave) and `pnpm verify:fast` (per WP)
`verify:fast` = `format:check` → `typecheck` → `lint` → `vitest run --changed` → `check:scope`; no build. Full order:
`format:check` → `typecheck` → `lint` → `depcruise` → `knip` → `jscpd` → `check:brand` → `check:vocab` → `check:disables` → `check:docs` → `harness:evals` → `test` (unit + integration with coverage) → `build` → `size`.
Coverage (lines/branches): kernel 95/90, platform 90/85, modules 90/85, adapters 75/65, ui 60/50 (pure logic in `packages/ui/src/lib/**` only; component behavior is covered by Playwright).

### 6.7 Git
Conventional Commits (`feat(crm): …`); generated files committed only for Payload migrations and `payload-types.ts`.

### 6.8 Config skeletons (create exactly, then extend only as needed)
`pnpm-workspace.yaml`:
```yaml
packages:
  - apps/*
  - packages/*
  - packages/modules/*
  - packages/adapters/*
```
Root `package.json`:
```json
{
  "name": "ops-platform", "private": true, "license": "UNLICENSED", "type": "module",
  "packageManager": "pnpm@10.34.5", "engines": { "node": ">=22 <23" },
  "scripts": {
    "dev": "pnpm --filter web dev",
    "preview": "pnpm --filter web preview",
    "build": "pnpm --filter web build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "pnpm -r --parallel exec tsc --noEmit",
    "lint": "eslint . --max-warnings 0",
    "depcruise": "depcruise apps packages --config tooling/depcruise/.dependency-cruiser.cjs",
    "knip": "knip --config tooling/knip/knip.json",
    "jscpd": "jscpd --config tooling/jscpd/.jscpd.json .",
    "check:brand": "tsx scripts/check-brand.ts",
    "check:vocab": "tsx scripts/check-vocab.ts",
    "check:disables": "tsx scripts/check-disables.ts",
    "check:docs": "tsx scripts/check-docs.ts",
    "check:scope": "tsx scripts/check-scope.ts",
    "harness:plan": "tsx scripts/harness/plan.ts",
    "harness:brief": "tsx scripts/harness/brief.ts",
    "harness:record": "tsx scripts/harness/record.ts",
    "harness:retro": "tsx scripts/harness/retro.ts",
    "harness:evals": "tsx scripts/harness/evals.ts",
    "test": "vitest run --coverage",
    "test:e2e": "playwright test",
    "size": "tsx scripts/check-size.ts",
    "seed:dev": "tsx scripts/seed-dev.ts",
    "db:reset:local": "tsx scripts/reset-local-db.ts",
    "tenant:provision": "tsx scripts/provision-tenant.ts",
    "tenant:smoke": "tsx scripts/smoke-tenant.ts",
    "tenants:deploy": "tsx scripts/deploy-tenants.ts",
    "verify:fast": "pnpm format:check && pnpm typecheck && pnpm lint && vitest run --changed",
    "verify": "pnpm format:check && pnpm typecheck && pnpm lint && pnpm depcruise && pnpm knip && pnpm jscpd && pnpm check:brand && pnpm check:vocab && pnpm check:disables && pnpm check:docs && pnpm harness:evals && pnpm test && pnpm build && pnpm size"
  }
}
```
`eslint.config.js`:
```js
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import boundaries from 'eslint-plugin-boundaries'
import { gatedRules, tsxOverrides, boundaryElements, boundaryRules } from './tooling/eslint/rules.js'

export default defineConfig(
  { ignores: ['**/.open-next/**', '**/.next/**', '**/dist/**', 'apps/web/src/payload-types.ts', 'apps/web/src/migrations/**', 'packages/ui/src/components/ui/**'] },
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  { languageOptions: { parserOptions: { projectService: true } } },
  { plugins: { boundaries }, settings: { 'boundaries/elements': boundaryElements }, rules: { ...gatedRules, ...boundaryRules } },
  { files: ['**/*.tsx'], rules: tsxOverrides },
  { files: ['packages/adapters/payload/src/collections/**'], rules: { 'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }] } },
)
```
`tooling/eslint/rules.js` exports `gatedRules` (the §6.2 `.ts` column), `tsxOverrides` (the `.tsx` differences), `boundaryElements`
(`kernel: packages/kernel`, `platform: packages/platform`, `module: packages/modules/*` capture `module`, `adapter: packages/adapters/*` capture `adapter`,
`ui: packages/ui`, `templates: packages/templates`, `app: apps/*`) and `boundaryRules` = `{ 'boundaries/dependencies': ['error', { default: 'disallow', rules: <§5.2 as allow lists> }] }`.
If the v7.2.0 options schema differs, keep dependency-cruiser as the authority and record the adjustment in the decision register.

`tooling/depcruise/.dependency-cruiser.cjs`:
```js
const infra = 'node_modules/(payload|@payloadcms|next|react|react-dom|@opennextjs|wrangler)'
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    { name: 'kernel-isolated', severity: 'error', from: { path: '^packages/kernel' }, to: { path: '^(packages/(platform|modules|adapters|ui|templates)|apps)' } },
    { name: 'platform-no-upward', severity: 'error', from: { path: '^packages/platform' }, to: { path: `^(packages/(modules|adapters|ui|templates)|apps)|${infra}` } },
    { name: 'modules-no-cross', severity: 'error', from: { path: '^packages/modules/([^/]+)/' }, to: { path: '^packages/modules/', pathNot: '^packages/modules/$1/' } },
    { name: 'modules-no-infra', severity: 'error', from: { path: '^packages/modules' }, to: { path: `^(packages/(adapters|ui)|apps)|${infra}` } },
    { name: 'cf-adapter-no-payload', severity: 'error', from: { path: '^packages/adapters/cloudflare' }, to: { path: '^(packages/(adapters/payload|ui)|apps)|node_modules/(payload|@payloadcms)' } },
    { name: 'ui-no-domain-runtime', severity: 'error', from: { path: '^packages/ui' }, to: { path: '^packages/(platform|modules|adapters)|node_modules/(payload|@payloadcms)', dependencyTypesNot: ['type-only'] } },
    { name: 'no-dev-deps-in-runtime', severity: 'error', from: { path: '^(packages|apps)/.*/src', pathNot: '\\.test\\.ts$' }, to: { dependencyTypes: ['npm-dev'] } },
  ],
  options: { doNotFollow: { path: 'node_modules' }, tsPreCompilationDeps: true, tsConfig: { fileName: 'tsconfig.json' } },
}
```
`tooling/knip/knip.json`:
```json
{
  "workspaces": {
    ".": { "entry": ["scripts/*.ts"] },
    "apps/web": { "entry": ["worker.ts", "src/payload.config.ts", "src/proxy.ts", "src/app/**/*.{ts,tsx}"], "ignore": ["src/payload-types.ts", "src/migrations/**"] },
    "apps/mail-router": { "entry": ["src/index.ts"] },
    "packages/*": { "entry": ["src/index.ts"] },
    "packages/modules/*": { "entry": ["src/index.ts"] },
    "packages/adapters/*": { "entry": ["src/index.ts"] }
  },
  "ignore": ["packages/ui/src/components/ui/**"]
}
```
`tooling/jscpd/.jscpd.json`:
```json
{ "threshold": 2, "minTokens": 60, "reporters": ["console"], "gitignore": true,
  "ignore": ["**/test/**", "**/*.test.ts", "packages/templates/**", "packages/ui/src/components/ui/**", "apps/web/src/migrations/**", "apps/web/src/payload-types.ts", "**/.open-next/**", "**/.next/**"] }
```
`vitest.config.ts`: `test.projects` = kernel, platform, modules/*, templates, ui (`environment: 'node'`); adapters/payload integration uses `@cloudflare/vitest-pool-workers` with the web app's wrangler config and local D1.

`apps/web/.dev.vars.example` (copy to `.dev.vars`, never commit `.dev.vars`):
```
PAYLOAD_SECRET=dev-only-replace-with-32-random-bytes
INTERNAL_SECRET=dev-internal-secret
TENANT_SECRET=dev-tenant-secret
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
TURNSTILE_HOSTNAMES=localhost
MAIL_TRANSPORT=console
APP_ORIGIN=http://localhost:3000
TENANT_SLUG=dev
INBOUND_DOMAIN=in.localhost
```
(`1x0000000000000000000000000000000AA` is Turnstile's always-pass test secret; production uses real secrets only.)

### 6.9 Local development & seed data
- `pnpm dev`: Next dev server with Cloudflare bindings emulated locally (use the dev binding setup shipped by the `with-cloudflare-d1` template; keep it).
- `pnpm preview`: `opennextjs-cloudflare build && opennextjs-cloudflare preview` (real workerd runtime). Cron locally: `curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"`.
- Inbound email locally: `curl -X POST http://localhost:3000/api/v1/internal/email/inbound -H "x-internal-secret: dev-internal-secret" -H "x-envelope-from: …" -H "x-envelope-to: …" --data-binary @fixtures/email/reply.eml`.
- `pnpm db:reset:local`: deletes the local D1 state directory under `.wrangler/state` and re-runs `payload migrate`.
- `pnpm seed:dev` (Local API against local D1, idempotent by email/name):
  settings `appName "Demo Workspace"`, timezone `America/New_York`, template `agency`;
  users (password `DevPassword123!`): `owner@example.test` (owner), `manager@example.test` (manager), `staff1@example.test`, `staff2@example.test` (staff, report to manager);
  groups `Design` (staff1), `Development` (staff2); 3 organizations, 5 contacts, 12 leads across all lead stages, 6 deals, 2 projects,
  20 tasks with due dates from −3 to +10 days relative to now, intake form `website` with origin `http://localhost:3000`.
  Fixtures live in `scripts/fixtures/*.ts`; the `example.test` domain only.

---

## 7. Documentation standards (part of Definition of Done)
### 7.1 Required docs
```
docs/
  spec.md                          this file, committed verbatim in M0
  architecture.md                  layers, request lifecycle, tenancy, email flows (mermaid diagrams)
  decisions/decision-register.md   §2, kept current
  decisions/open-questions.md
  adr/0001-foundation.md 0002-tenancy.md 0003-code-license.md (open) NNNN-<title>.md
  runbooks/provision-tenant.md deploy.md rollback.md onboarding-customer.md incident.md
  reports/m<N>.md  reports/size.json
  orchestration/m<N>/plan.md  orchestration/m<N>/reports/
```
### 7.2 ADR template
`# ADR-NNNN: Title` · Status (proposed | accepted | superseded) · Date · Context · Decision · Consequences · Alternatives considered.
### 7.3 Package README headings (checked)
`## Purpose` · `## Public API`; modules also add `## Ports` and `## Invariants`.
### 7.4 Comments
TSDoc on every exported symbol (one-sentence purpose, non-obvious `@param`, error codes under `@returns`). Inline comments explain *why*,
never *what*. No commented-out code. No TODO without a `Q-<n>` reference.
### 7.5 No-bloat docs
Docs describe current behavior only; outdated sections are deleted in the same PR; link instead of duplicating.

---

## 8. Kernel (`@ops/kernel`)
| Export | Contract |
|---|---|
| `Result<T, E>`, `ok()`, `err()`, `isOk()` | Discriminated union; no exceptions cross layer boundaries |
| `DomainError` | `{ code: ErrorCode; message: string; details?: Record<string, unknown> }` |
| `ErrorCode` | `VALIDATION`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `ALREADY_DONE`, `RATE_LIMITED`, `UNAVAILABLE`, `INTERNAL` (HTTP/UI mapping §12.1) |
| `Id` (branded string), `newId()` | `newId()` = `crypto.randomUUID()` for non-persisted ids; persisted ids come from Payload (D-08) |
| `Clock` port `{ now(): number }` | `systemClock`, `fixedClock(ms)` |
| `Logger` port `{ debug, info, warn, error }(msg: string, fields?: Record<string, unknown>)` | JSON console adapter in apps; `redact()` removes keys `password`, `token`, `cookie`, `authorization`, `secret`, `payload`, `body`, `html`, `text` |
| `rankBetween(before?: string, after?: string): string`; `rebalance(count: number): string[]` | Fractional index over base-62. A move writes only the moved record (new rank between its neighbours, guarded by `expectedUpdatedAt`); lists are ordered by `(rank, id)` so equal ranks from concurrent moves stay stable. When a new rank would exceed 32 characters the move still succeeds and triggers `rebalanceColumn`, a separate operation that rewrites ranks with per-row conditional updates (matching `id` and previous `rank`) and retries rows that changed |
| `Page<T>` `{ items; total; page; pageSize }`, `PageRequest` | page ≥ 1, pageSize ≤ 100 |
| `FilterNode` | `{ and: FilterNode[] }` · `{ or: FilterNode[] }` · `{ field; op: eq \| neq \| in \| nin \| contains \| like \| gt \| gte \| lt \| lte \| exists; value }` |
| `SortSpec` | `{ field; direction: 'asc' \| 'desc' }[]` |
| `Money` | `{ amountMinor: number; currency: string }`; `formatMoney(money, locale)` via `Intl.NumberFormat` |
| `zonedDayWindow(timeZone, ms)` | `{ start, end }` epoch ms of the local day |
| `hexToOklch(hex)`, `contrastRatio(a, b)` | brand token helpers |
| `DomainEvent<TType, TPayload>` | `{ id; type; occurredAt; actorId; payload }` |

---

## 9. Platform building blocks (`@ops/platform`, domain-agnostic)
All blocks operate on `RecordRef = { type: string; id: Id }` and registered record types.

### 9.1 Record registry
`RecordTypeDefinition { type; labelKey; titleField; ownerField?; assigneesField?; groupField?; workflowField?; stageField?; searchFields: string[]; trackedFields: string[]; scopeExtensions?: ScopeExtension[] }`.
Modules register their types at startup; activity, comments, attachments, views, search and permissions work only through the registry.

### 9.2 Terminology
`TerminologyOverrides = Record<recordType, { singular: string; plural: string }>`; `resolveLabel(type, count, overrides, t)`.
UI never hardcodes entity names; it uses message keys `entity.<type>.singular|plural` with overrides injected as variables.

### 9.3 Field definitions & custom data
`FieldDefinition { id; recordType; key /^[a-z][a-zA-Z0-9]{1,39}$/; label; type; required; options?: string[]; position; visibility: 'all' | 'manager_up'; sensitive: boolean }`.
Types: `text | longText | number | currency | date | select | multiSelect | checkbox | url | email | phone | user`.
`buildCustomDataSchema(defs)` → zod schema; `validateCustomData(defs, data)` → Result (unknown keys rejected). ≤ 60 definitions per record type.
Deleting a definition hides it; stored values remain. Phase 1: custom fields are displayed, edited and validated, not filtered or sorted (Phase 3 ADR).

### 9.4 Workflows & stages
```
Workflow { id; recordType; name; stages: Stage[]; defaultStageId; transitions: 'any' }      // Phase 1 allows any → any
Stage    { id; name; category: StageCategory; color: StageColor; position; probability?: number /* 0..100 */ }
StageCategory = backlog | open | active | waiting | done_success | done_failure | cancelled
StageColor    = gray | blue | green | amber | red | violet | teal | pink
isTerminal(stage) = category ∈ { done_success, done_failure, cancelled }
```
Invariants: ≥ 1 non-terminal stage; exactly one default (non-terminal); unique names within a workflow; ≤ 20 stages; deleting a stage requires `moveRecordsToStageId`.
**`changeStage(deps, { record: RecordRef; toStageId; expectedUpdatedAt: number; reason?: string })`**
1 load record (NOT_FOUND) → 2 authorize `update` (FORBIDDEN) → 3 compare `updatedAt` with `expectedUpdatedAt` (CONFLICT) → 4 same stage → ok, no writes →
5 run module stage hooks (e.g. lost reason required) → 6 duration = now − `stageEnteredAt` → 7 unit of work: record `stageId` + `stageEnteredAt`,
`StageTransition`, activity `stage.changed` → 8 emit `stage.changed`. Returns the updated record.
`StageTransition { id; record: RecordRef; workflowId; fromStageId; toStageId; fromCategory; toCategory; changedBy; changedAt; durationMs }`.

### 9.5 Activity
`ActivityEntry { id; record: RecordRef; verb; actorId: Id | null; data: JSON (≤ 8 KB); occurredAt }`.
Verbs: `record.created | field.changed | stage.changed | assignment.changed | comment.added | mention.added | attachment.added | attachment.downloaded | email.sent | email.received | relation.linked | record.converted`.
`diffFields(before, after, trackedFields)` emits `field.changed` only for tracked fields. Append-only; no update or delete path.

### 9.6 Comments & mentions
`Comment { id; record; authorId; body (≤ 10,000 chars, markdown-lite); mentions: Id[]; createdAt; editedAt?; deletedAt? }`.
Composer inserts mention tokens `@[Display Name](userId)`; `parseMentions(body)` extracts ids. Author may edit within 24 h. Delete: author or manager_up; soft delete replaces the body with an i18n "deleted" marker.

### 9.7 Attachments
`Attachment { id; record; fileKey; fileName; mime; sizeBytes; uploadedBy; createdAt }`. Max 25 MB. Mime allowlist: pdf, png, jpeg, webp, gif, txt, csv, docx, xlsx, pptx, zip.
R2 key: `attachments/<recordType>/<recordId>/<attachmentId>/<sanitizedFileName>` (NFKD, `[^a-zA-Z0-9._-]` → `-`, ≤ 120 chars).
Downloads are streamed by the Worker from the R2 binding **after** authorization (`Content-Disposition: attachment`, `Cache-Control: private, no-store`); buckets are never public and no URLs are shared.
Downloads of attachments on sensitive records write activity `attachment.downloaded`.
Brand assets: `brand/logo.<ext>` and `brand/favicon.<ext>`, served publicly by `/api/v1/brand/logo` and `/api/v1/brand/favicon` (§12).

### 9.8 Notifications
`Notification { id; userId; type; record?: RecordRef; actorId?; data; dedupeKey (unique); readAt?; emailedAt?; createdAt }`.
Types: `assigned | mentioned | due_soon | overdue | digest | intake_received | email_received | invitation_accepted | stalled`.
`notify(deps, input)`: insert; unique-constraint conflict on `dedupeKey` → ok without a duplicate. Email delivery follows
`NotificationPrefs { userId; channels: Record<type, { inApp: boolean; email: boolean }>; digestLocalTime: 'HH:mm' | null }`.
Defaults: assigned, mentioned, intake_received, email_received, due_soon, overdue, stalled → in-app + email; digest → off for staff, `08:00` for owner/manager.

### 9.9 Views & layouts
`SavedView { id; recordType; ownerId: Id | null (null = shared); name; kind: 'table' | 'board' | 'calendar' | 'timeline'; filter: FilterNode | null; sort: SortSpec; columns: string[]; pinned: boolean; isDefault: boolean }`.
Shared views: manager_up. Personal: any user; ≤ 30 per user per record type.
`Layout { recordType; sidebarFields: string[]; quickCreateFields: string[] }` (one per record type in Phase 1).

### 9.10 Permissions (pure policy)
Actor: `{ id; role; groupIds; reportIds (transitive via reportsTo, depth ≤ 5); active }`. Inactive actors are FORBIDDEN everywhere.
`can(actor, action, resource)`; actions: `read | create | update | delete | assign | convert | manage_settings | manage_members | manage_workflows | manage_intake | admin_panel`.
| Capability | owner | manager | staff |
|---|---|---|---|
| read records | all | all | scoped |
| create records | yes | yes | yes |
| update records | all | all | scoped |
| delete records | yes | yes | no |
| assign others | yes | yes | only on scoped records |
| convert lead | yes | yes | scoped |
| manage_members | all roles | staff only | no |
| manage_settings (general, branding, email, modules) | yes | no | no |
| manage_workflows / fields / shared views / terminology / intake | yes | yes | no |
| admin_panel (`/admin`) | yes | yes | no |
**Staff scope** `scopeFilter(actor, recordType)` = OR of: `ownerId ∈ {actor.id, ...reportIds}`; `assigneeIds contains actor.id`; `groupId ∈ actor.groupIds` (when the type has a group field);
plus registered `scopeExtensions` (work module: `project.memberIds contains actor.id` for projects and their tasks).
Adapters convert `FilterNode` → Payload `Where`, AND it into every query, and always pass `overrideAccess: false` with the user, except system jobs (explicit `SystemActor`).
Sensitive custom fields (`sensitive: true`) are readable by manager_up only.

### 9.11 Templates
`TemplateDefinition { key; version; modules; terminology; workflows (without ids); fields; views; layouts; sources; lostReasons; intakeForms?; notificationDefaults?; sensitive: boolean }` validated by zod.
`applyTemplate(deps, key)`: idempotent per `(key, version)` recorded in `settings.appliedTemplates`; creates missing items, never deletes user data.

### 9.12 Settings & branding
Settings global: `appName; logoFileKey?; faviconFileKey?; brand: { primaryHex; radius: 'sm' | 'md' | 'lg' }; timezone (IANA); locale ('en' | 'es'); currency (ISO 4217); weekStartsOn (0 | 1);
modules: { crm; work; intake; mail }; terminology; stalledDays; email: { fromName; fromAddress; senderStatus: 'unverified' | 'verified'; inboundDomain; inboundLocalPrefix?: string }; onboardedAt?; appliedTemplates: { key; version }[]`.
`brandTokens(brand)` → CSS variables; overrides only `--primary`, `--primary-foreground` (auto black/white for contrast ≥ 4.5:1), `--ring`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--radius`.

### 9.13 Unit of work & events
Port `UnitOfWork.run(fn)`; implementation per D-36. In-process `EventBus`, dispatched after commit, for cross-module reactions (e.g. `record.assigned` → notifications).

---

## 10. Domain modules

### 10.1 CRM (`@ops/module-crm`)
Record types `organization`, `contact`, `lead`, `deal`; lookups `source`, `lostReason`.
| Type | Core fields | Tracked fields |
|---|---|---|
| organization | name (required), website, phone, email, ownerId, sourceId, customData | name, ownerId |
| contact | firstName (required), lastName, email, phone, organizationId, ownerId, customData | email, phone, organizationId, ownerId |
| lead | title (required; default "{firstName} {lastName}" or companyName), firstName, lastName, email, phone, companyName, organizationId, sourceId, ownerId, assigneeIds, workflowId, stageId, stageEnteredAt, lostReasonId, lostNote, convertedAt, convertedDealId, intakeSubmissionId, customData | stageId, ownerId, assigneeIds, email, phone |
| deal | title (required), organizationId, contactIds, primaryContactId, value (Money), expectedCloseAt, closedAt, ownerId, assigneeIds, workflowId, stageId, stageEnteredAt, sourceLeadId, lostReasonId, lostNote, customData | stageId, value, ownerId, assigneeIds, expectedCloseAt |
Invariants: entering `done_failure` requires `lostReasonId`; deals entering `done_success | done_failure` set `closedAt`, leaving clears it; a converted lead's stage cannot change.
Commands: `createOrganization`, `updateOrganization`, `createContact`, `updateContact`, `createLead`, `updateLead`, `convertLead`, `createDeal`, `updateDeal`, `markLost`. (`mergeContacts` Phase 2.)
**`convertLead(deps, { leadId; expectedUpdatedAt; organization: { existingId } | { create: { name } } | null; contact: { existingId } | { create: true }; deal: { title?; value?; workflowId? } })`**
1 authorize `convert` → 2 lead exists and `convertedAt` is null (ALREADY_DONE) → 3 `updatedAt` check (CONFLICT) → 4 resolve or create organization →
5 resolve or create contact (dedupe by email; an existing match is linked) → 6 create deal: title default lead.title, owner and assignees copied, `sourceLeadId`,
customData copies keys that exist on deal field definitions with the same type, stage = deal workflow default → 7 lead: `convertedAt`, `convertedDealId`,
stage = first `done_success` stage of the lead workflow → 8 activity `record.converted` on the lead and `record.created` (data `fromLead`) on the deal →
9 emit event. One unit of work; idempotency key `convert:<leadId>`.

### 10.2 Work (`@ops/module-work`)
| Type | Core fields | Tracked fields |
|---|---|---|
| project | name (required), organizationId, ownerId, memberIds, workflowId, stageId, stageEnteredAt, startAt, targetEndAt, description (≤ 20,000), customData | stageId, ownerId, memberIds, targetEndAt |
| task | title (required, ≤ 300), description, projectId, relatedType + relatedId, parentTaskId (depth ≤ 2), workflowId, stageId, stageEnteredAt, rank, priority (`none \| low \| medium \| high \| urgent`), assigneeIds, groupId, startAt, dueAt, completedAt, customData | stageId, assigneeIds, dueAt, priority |
| taskDependency (Phase 3) | predecessorId, successorId, type `finish_to_start`, lagMinutes | — |
Invariants: personal tasks (no project, no related record) allowed; subtasks inherit `projectId`; entering `done_success` sets `completedAt`, leaving clears it; a parent cannot enter a terminal stage while children are open (CONFLICT listing open children).
Commands: `createProject`, `updateProject`, `addProjectMember`, `removeProjectMember`, `createTask`, `updateTask`, `moveTask` (stage + rank), `completeTask`, `reopenTask`, `setTaskDates`.
Query `myTasksBuckets(actor, timeZone, now)` → `{ overdue, today, next7Days, later, noDueDate }` (non-terminal stages only).

### 10.3 Intake (`@ops/module-intake`)
`IntakeForm { id; key (slug, unique); name; active; targetRecordType: 'lead'; fieldMap: Record<incomingKey, targetField | 'custom:<key>' | 'ignore'>; allowedOrigins: string[];
requireTurnstile: boolean (forced true in production for browser submissions); serverKeyHashes: string[] (SHA-256 of per-site server keys); defaultOwnerId?; defaultAssigneeIds: Id[];
defaultSourceId?; notifyUserIds: Id[]; notifyGroupIds: Id[]; successMessage; redirectUrl?; emailAlias? (e.g. 'leads') }`.
`IntakeSubmission { id; formId; channel: 'web' | 'server' | 'email'; receivedAt; origin; ipHash (SHA-256 of IP + TENANT_SECRET); userAgent; payload (JSON ≤ 16 KB); dedupeKey; status: accepted | duplicate | rejected_spam | rejected_invalid; recordRef? }`.
Accepted base keys: `name, firstName, lastName, email, phone, company, service, subject, message, source, page`.
**`submitIntake`**: form active (else NOT_FOUND) → rate limit `RATE_LIMIT_INTAKE` key `ipHash:formKey` (RATE_LIMITED) → channel:
server if header `x-intake-key` hashes to a `serverKeyHashes` entry (skips origin + Turnstile); web requires `Origin` ∈ `allowedOrigins` and Turnstile verification:
`POST https://challenges.cloudflare.com/turnstile/v0/siteverify` form-encoded `secret`, `response` (token ≤ 2048 chars), `remoteip` (`CF-Connecting-IP`), 10 s timeout;
require `success === true` and `hostname` ∈ `TURNSTILE_HOSTNAMES`; tokens are single-use → zod validation (email or phone required) →
`dedupeKey` = SHA-256(formId + lower(email) or digits(phone) + message + local date) → duplicate → status `duplicate`, 200 →
create lead (title from name/company/subject; source from form default or `source` key), message stored as first comment by the system actor,
activity `record.created` with `data.channel`, notify `intake_received`. Payload values are never logged.

### 10.4 Mail (`@ops/module-mail`)
`EmailMessage { id; direction: 'outbound' | 'inbound'; record?: RecordRef; messageId; inReplyTo?; from; to: string[]; cc: string[]; subject; textBody (≤ 200 KB); htmlFileKey? (R2); attachmentIds: Id[]; status: queued | sent | failed | received | quarantined; error?; occurredAt }`.
Ports: `MailSender.send({ from, to, cc?, replyTo?, subject, html, text, headers? }) → Result<{ messageId }>`; `InboundParser.parse(raw: ArrayBuffer) → ParsedEmail`; `RecordAddressing`.
Addressing (routing in §14.4): custom-domain tenants use `<local>@<inboundDomain>`; platform-domain tenants use `<slug>--<local>@in.<PLATFORM_DOMAIN>`.
- local `r-<token>`: token = base32(HMAC-SHA256(TENANT_SECRET, `${recordType}:${recordId}`)), first 16 characters → append to the record thread.
- local `<intakeForm.emailAlias>` → intake submission with channel `email`.
- anything else → quarantined (managers review in `/settings/email`).
Outbound record emails set `Reply-To` to the record address; record-scoped notification emails do too.
Inbound acceptance: the envelope sender must match an email on the record (lead/contact/deal contacts) or an active user; otherwise quarantine. Duplicate `messageId` → ignored.
Attachments ≤ 10 MB each become Attachments. Activity `email.received`; notify record owner and assignees (`email_received`).
Commands: `sendSystemEmail` (templates §14.1), `receiveInboundEmail`, `releaseQuarantined`, `sendRecordEmail` (Phase 2 UI).

---

## 11. Persistence (Payload adapter)
Rules: every collection `timestamps: true`; `versions: false` (activity is the audit trail); collections hidden from staff in admin; `access` functions call platform `can` + `scopeFilter`;
hooks call module validators and commands only (§11.2); `defaultDepth: 0`, `maxDepth: 2`; GraphQL disabled; `idType: 'uuid'`.

| Collection slug | Record type | Indexes (besides id) |
|---|---|---|
| users | — | email unique, role, active |
| groups | — | name unique |
| invitations | — | tokenHash unique, email, status |
| settings (global) | — | — |
| fieldDefinitions | — | (recordType, key) unique |
| workflows | — | recordType |
| savedViews | — | (recordType, ownerId) |
| layouts | — | recordType unique |
| organizations | organization | name, ownerId, updatedAt |
| contacts | contact | email, organizationId, ownerId |
| leads | lead | stageId, ownerId, sourceId, createdAt, convertedAt, email |
| deals | deal | stageId, ownerId, expectedCloseAt, organizationId |
| sources, lostReasons | — | name unique |
| projects | project | stageId, ownerId, organizationId |
| tasks | task | (projectId, stageId, rank), dueAt, parentTaskId, stageId, (relatedType, relatedId) |
| stageTransitions | — | (recordType, recordId, changedAt) |
| activity | — | (recordType, recordId, occurredAt) |
| comments | — | (recordType, recordId, createdAt) |
| attachments (upload, R2) | — | (recordType, recordId) |
| notifications | — | dedupeKey unique, (userId, readAt, createdAt) |
| notificationPrefs | — | userId unique |
| intakeForms | — | key unique, emailAlias unique |
| intakeSubmissions | — | dedupeKey unique, (formId, receivedAt) |
| emailMessages | — | messageId unique, (recordType, recordId, occurredAt) |
| jobRuns | — | (job, windowStart) unique |
`hasMany` relations (assignees, members, contacts) use Payload relationship fields. Polymorphic references are stored as `relatedType` (select of registered types) + `relatedId` (text) for indexability.
Migrations: `pnpm --filter web payload migrate:create <name>` per schema change; committed; applied migrations are never edited.

### 11.1 Access per collection
Legend: O owner · M manager · S staff · *scope* = §9.10 staff scope · *parent* = same access as the referenced record · *system* = commands/jobs with `SystemActor` only.
| Collection | read | create | update | delete |
|---|---|---|---|---|
| users | O M all; S active users (name, email, avatar, role only) | system (invitation accept, provisioning) | O all; M staff users only; self: name, avatar, password | never (deactivate instead) |
| groups | O M S | O M | O M | O M |
| invitations | O M | O any role; M staff only | O M (resend, revoke) | never |
| settings | O M S (non-secret fields) | — | O: all; M: terminology, stalledDays | — |
| fieldDefinitions | O M S | O M | O M | O M (hide) |
| workflows | O M S | O M | O M | O M (requires target stage) |
| savedViews | shared: all; personal: owner of view | all (personal); O M (shared) | view owner; O M (shared) | view owner; O M (shared) |
| layouts | O M S | O M | O M | O M |
| organizations | O M all; S scope | O M S | O M all; S scope | O M |
| contacts | O M all; S scope | O M S | O M all; S scope | O M |
| leads | O M all; S scope | O M S | O M all; S scope | O M |
| deals | O M all; S scope | O M S | O M all; S scope | O M |
| sources | O M S | O M | O M | O M |
| lostReasons | O M S | O M | O M | O M |
| projects | O M all; S scope | O M S | O M all; S scope | O M |
| tasks | O M all; S scope | O M S | O M all; S scope | O M; creator within 24 h |
| stageTransitions | parent | system | never | never |
| activity | parent | system | never | never |
| comments | parent | parent | author within 24 h | author; O M (soft) |
| attachments | parent | parent | never | uploader; O M |
| notifications | self | system | self (`readAt` only) | never |
| notificationPrefs | self | system (on user create) | self | never |
| intakeForms | O M | O M | O M | O M |
| intakeSubmissions | O M | system (public route) | never | system (cleanup job) |
| emailMessages | parent; quarantined: O M | system | system (status) | never |
| jobRuns | O M | system | system | never |

### 11.2 Hooks & invariants (admin edits cannot bypass domain rules)
- Every record collection: `beforeChange` → module `validate<Type>Change({ before: originalDoc, after: data, actor })`, the same validators commands use, so admin edits cannot bypass invariants;
  `afterChange` → `diffFields` activity + events; when `stageId` changed outside `changeStage` (no `req.context.stageRecorded`), record `StageTransition` and `stageEnteredAt`.
- `beforeDelete` → module `canDelete` (e.g. a stage in use, a lead with a converted deal).
- `users`: `beforeLogin` throws when `active` is false (login denied); `beforeChange` rejects demoting or deactivating the last active owner (CONFLICT `last active owner`).
- `users` auth config: `tokenExpiration: 604800`, `maxLoginAttempts: 5`, `lockTime: 600000`, `cookies: { secure: true, sameSite: 'Lax' }`, `useAPIKey: false`,
  `forgotPassword: { expiration: 3600000, generateEmailSubject, generateEmailHTML }` → mail module `passwordReset` template linking `${APP_ORIGIN}/reset-password?token=${token}`.
- `email` config: the Cloudflare adapter from §14.3.
- Admin: `admin.user = 'users'`, `access.admin` → `can(actor, 'admin_panel')`; the "create first user" flow is unused because provisioning seeds the owner invitation (§19.3).

---

## 12. API contracts
Payload REST (`/api/<collection>`) serves the Payload admin only; the product UI uses Server Actions and RSC. Custom route handlers:
| Method & path | Auth | Request | Response | Errors |
|---|---|---|---|---|
| GET `/api/v1/health` | none | — | `{ status: 'ok', version, migration }` | — |
| POST `/api/v1/auth/login` | none, `RATE_LIMIT_AUTH` | `{ email, password }` | sets Payload cookie; `{ redirect }` | 400, 401, 423 locked, 403 inactive, 429 |
| POST `/api/v1/auth/forgot-password` | none, `RATE_LIMIT_AUTH` | `{ email }` | always 200 | 429 |
| POST `/api/v1/auth/reset-password` | token, `RATE_LIMIT_AUTH` | `{ token, password }` (D-46) | `payload.resetPassword` → cookie; `{ redirect: '/' }` | 400 policy, 410 invalid/expired token, 429 |
| POST `/api/v1/auth/change-password` | session | `{ currentPassword, newPassword }` | 200 | 400 policy, 401 wrong current |
| POST `/api/v1/invitations/accept` | token, `RATE_LIMIT_AUTH` | `{ token, name, password }` (D-46) | creates user, cookie; `{ redirect: '/onboarding' \| '/' }` | 400, 404, 409 expired/revoked/accepted |
| POST `/api/v1/intake/:formKey` | public (§10.3) | JSON or form-encoded base keys + extras; `cf-turnstile-response` | 200 `{ status: 'accepted' \| 'duplicate', message }`; 303 to `redirectUrl` for form posts | 400, 403, 404, 429 |
| OPTIONS `/api/v1/intake/:formKey` | public | — | CORS headers for allowlisted origins only | — |
| POST `/api/v1/files` | session | multipart `{ recordType, recordId, file }` | `{ attachment }` | 400 size/mime, 403 |
| GET `/api/v1/files/:attachmentId` | session | — | streams the object from R2 after authorization | 403, 404 |
| GET `/api/v1/brand/logo` · `/api/v1/brand/favicon` | none | — | streams `brand/*` from R2, `Cache-Control: public, max-age=300`; favicon falls back to an inline SVG letter tile | 404 logo unset |
| GET `/api/v1/notifications/unread-count` | session | — | `{ count }` | — |
| GET `/api/v1/search?q=` | session | `q` 2–80 chars | `{ results: { recordType, id, title, subtitle }[] }` (§12.2) | 400 |
| POST `/api/v1/internal/cron` | `x-internal-secret` via service binding | `{ scheduledTime }` | `{ ran: string[] }` | 401 |
| POST `/api/v1/internal/email/inbound` | `x-internal-secret` | raw MIME; headers `x-envelope-from`, `x-envelope-to` | `{ status }` | 401, 413 (> 25 MiB) |
Cookie creation after Local API login/reset/accept uses Payload's cookie helper for the users collection (verify the exported helper name in M1; else set the Payload token cookie with the collection's cookie options) and record it in the decision register.
`src/proxy.ts` returns 404 for `/api/users/forgot-password`, `/api/users/reset-password`, `/api/users/unlock`, `/api/users/first-register`, `/api/users/verify/*` and `POST /api/users`,
so every set-password path goes through the D-46 policy; Payload admin keeps `/api/users/login`, `/logout`, `/me`, `/refresh-token` (protected by Payload lockout).
Server Actions (one per command) at `apps/web/src/server/actions/<module>/<command>.ts`: `parse(schema)` → `getActor()` → `execute` → `revalidatePath` → return `ActionResult` (`{ ok: true, data } | { ok: false, error: DomainError }`).

### 12.1 Error mapping
| ErrorCode | HTTP | UI treatment |
|---|---|---|
| VALIDATION | 400 | Inline field errors in forms; toast for inline edits |
| NOT_FOUND | 404 | `not-found` page for routes; toast "no longer exists" + remove row for lists |
| FORBIDDEN | 403 | `ErrorState` "no access" for pages; toast for actions |
| CONFLICT | 409 | Toast "Updated by someone else, refreshed" + `router.refresh()`; dialog message for business conflicts (e.g. last active owner, open subtasks) |
| ALREADY_DONE | 409 | Info toast + refresh |
| RATE_LIMITED | 429 | Toast "Too many attempts, try again in a minute" |
| UNAVAILABLE | 503 | `ErrorState` with retry; jobs retry next window |
| INTERNAL | 500 | `ErrorState` showing request id; error logged |

### 12.2 Search
For each registered record type visible to the actor: Payload `like` (case-insensitive `LIKE '%q%'`) OR-ed across `searchFields`
(organizations `name, email`; contacts `firstName, lastName, email, phone`; leads `title, email, phone, companyName`; deals `title`; projects `name`; tasks `title`),
AND scope filter, ordered by `updatedAt` desc, 5 results per type, 20 total. D1 FTS5 is deferred to a Phase 3 ADR.

---

## 13. Worker entry & background jobs
`apps/web/worker.ts`:
```ts
import openNext from './.open-next/worker.js'
import { dispatchCron, bridgeInboundEmail } from '@ops/adapter-cloudflare'

export default {
  fetch: openNext.fetch,
  scheduled: (controller, env, ctx) => { ctx.waitUntil(dispatchCron(env, controller.scheduledTime)) },   // POST self /api/v1/internal/cron
  email: (message, env, ctx) => { ctx.waitUntil(bridgeInboundEmail(env, message)) },                   // raw stream read once; POST self /api/v1/internal/email/inbound
} satisfies ExportedHandler<CloudflareEnv>
```
Bindings: `D1`, `R2`, `EMAIL` (`send_email`), `WORKER_SELF_REFERENCE` (service → own Worker), `RATE_LIMIT_INTAKE` (`ratelimits`, `simple { limit: 10, period: 60 }`),
`RATE_LIMIT_AUTH` (`ratelimits`, `simple { limit: 20, period: 60 }`); secrets `PAYLOAD_SECRET`, `INTERNAL_SECRET`, `TENANT_SECRET`, `TURNSTILE_SECRET`, optional `RESEND_API_KEY`;
vars `TENANT_SLUG`, `APP_ORIGIN`, `INBOUND_DOMAIN`, `TURNSTILE_HOSTNAMES`, `MAIL_TRANSPORT` (`cloudflare | resend | console`).
Rate limits are per Cloudflare location and eventually consistent, so Turnstile, Payload lockout and dedupe stay primary. `/__scheduled` is blocked in production.

| Job | Cadence | Idempotency | Behavior |
|---|---|---|---|
| `invitations.expire` | hourly | `jobRuns (job, hourStart)` | Pending past `expiresAt` → expired |
| `tasks.dueSoon` | every run | notification `(taskId, due_soon, dueLocalDate)` | Open tasks due within 24 h (tenant timezone) → notify assignees |
| `tasks.overdue` | first run after 09:00 tenant time | `(taskId, overdue, localDate)` | Open tasks with `dueAt` < start of today → notify assignees |
| `digest.send` | every run | `(userId, digest, localDate)` | Users whose `digestLocalTime` passed today: overdue, due today, new assignments, mentions |
| `records.stalled` | first run after 09:00 tenant time | `(recordId, stalled, localDate)` | Leads/deals/projects in a non-terminal stage longer than `stalledDays` → notify owner |
| `intake.cleanup` | daily | `jobRuns (job, localDate)` | Delete `rejected_*` submissions older than 30 days |
Each job processes ≤ 200 records per run and continues next run (cursor design: §21.4); logs `{ job, window, processed, created, skipped, durationMs }`.

---

## 14. Email

### 14.1 Outbound templates (`@ops/module-mail/templates`)
| Template | Trigger | Subject (en; terminology-aware) |
|---|---|---|
| invitation | invitation created or resent | `{inviterName} invited you to {appName}` |
| passwordReset | Payload `forgotPassword.generateEmailHTML/Subject` | `Reset your {appName} password` |
| assigned | notification `assigned` | `{actorName} assigned you: {recordTitle}` |
| mentioned | notification `mentioned` | `{actorName} mentioned you on {recordTitle}` |
| dueSoon / overdue | jobs | `Due soon: {taskTitle}` / `Overdue: {taskTitle}` |
| digest | job | `Your {appName} summary for {localDate}` |
| intakeReceived | intake accepted | `New {leadSingular}: {title}` |
| emailReceived | inbound email on a record | `New email on {recordTitle}` |
| stalled | job | `{recordTitle} has been in {stageName} for {days} days` |
Layout: 600 px single-column table, logo from `${APP_ORIGIN}/api/v1/brand/logo`, app name, body, one primary button (brand color), footer with a notification-settings link. Always `html` + `text`. No tracking pixels.
When the tenant template is `sensitive`, bodies contain only the record title and link; never field values or intake payloads.

### 14.2 Sender resolution
`from = "{settings.email.fromName} <{settings.email.fromAddress}>"` when `senderStatus = 'verified'`; otherwise `"{appName} <no-reply@notify.<PLATFORM_DOMAIN>>"` (D-41; the single sending subdomain is onboarded once).
Send errors: `E_SENDER_NOT_VERIFIED` → set `senderStatus = 'unverified'`, retry once with the platform sender; `E_RATE_LIMIT_EXCEEDED` → RATE_LIMITED (jobs retry next run); `E_VALIDATION_ERROR` → VALIDATION, logged.
Email Service limits honored by construction: 50 recipients per email across to/cc/bcc (every notification email has one recipient), 5 MiB total message size (no attachments on notification emails), 16 KB custom headers.
Resend fallback: `fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + RESEND_API_KEY } })` inside `ResendMailSender`; no SDK.

### 14.3 Payload email adapter
`@ops/adapter-cloudflare` exports `payloadEmailAdapter({ sender, defaultFromAddress, defaultFromName })` returning Payload's adapter function
`({ payload }) => ({ name: 'cloudflare-email-service', defaultFromAddress, defaultFromName, sendEmail: async (message) => … })`, which maps Payload's message (`to`, `subject`, `html`, `text`) to `MailSender.send`
and throws on error. `payload.config.ts` builds `sender` from `MAIL_TRANSPORT` and the `EMAIL` binding (via the Cloudflare context), `defaultFromAddress` per §14.2.

### 14.4 Inbound routing
| Tenant host type | Setup | Path |
|---|---|---|
| Customer domain in the platform operator's Cloudflare account (exception; e.g. `crm.customer-example.com`) | Email Routing → Settings → Subdomains: enable `in.<host>`; catch-all rule → Worker `ops-<slug>` | tenant Worker `email()` → internal inbound route |
| Platform domain (`<slug>.<PLATFORM_DOMAIN>`) | One subdomain `in.<PLATFORM_DOMAIN>` with catch-all → Worker `ops-mail-router` | router parses local part `<slug>--<local>` → service binding `TENANT_<SLUG>` → tenant internal inbound route with that tenant's `INTERNAL_SECRET_<SLUG>`; unknown slug → `message.setReject('Unknown recipient')` |
Why the router: a zone supports at most 30 domains for Email Routing + Email Sending combined, so per-tenant subdomains on the platform zone do not scale. Each domain allows 200 routing rules; catch-all avoids per-address rules.
Limits: inbound messages larger than 25 MiB are rejected by Email Routing; `bridgeInboundEmail` reads `message.raw` into an `ArrayBuffer` exactly once (single-use stream) and posts it with envelope headers.
`ops-mail-router` config is generated by `scripts/gen-wrangler.ts` from all tenants with `host` on the platform domain.

---

## 15. UI system (`@ops/ui`)

### 15.1 Setup (in `packages/ui`)
`pnpm dlx shadcn@4.21.0 init` → Base UI, base color `neutral`, CSS variables, components path `src/components/ui`. Then:
`pnpm dlx shadcn@4.21.0 add sidebar breadcrumb button input textarea label field select native-select combobox checkbox switch radio-group badge avatar card dialog alert-dialog sheet drawer popover dropdown-menu command tooltip tabs table skeleton separator scroll-area sonner calendar progress toggle-group kbd empty spinner pagination`
(all names verified in the official registry index on 13 Sep 2026; a date picker is composed from `popover` + `calendar`).
Vendored component source stays unmodified except token usage and documented variants; every modification is listed in `packages/ui/README.md`.

### 15.2 Tokens (`packages/ui/src/styles/tokens.css`)
Keep the shadcn `neutral` tokens generated by `init` verbatim for `:root` and `.dark`. Add:
```css
:root {
  --success: oklch(0.62 0.13 150); --success-foreground: oklch(0.99 0 0);
  --warning: oklch(0.75 0.15 75);  --warning-foreground: oklch(0.2 0 0);
  --info: oklch(0.62 0.12 245);    --info-foreground: oklch(0.99 0 0);
  --stage-gray: oklch(0.65 0.01 250); --stage-blue: oklch(0.62 0.13 250); --stage-green: oklch(0.62 0.13 150); --stage-amber: oklch(0.75 0.15 75);
  --stage-red: oklch(0.6 0.19 27); --stage-violet: oklch(0.58 0.15 295); --stage-teal: oklch(0.63 0.1 190); --stage-pink: oklch(0.65 0.17 350);
}
.dark { /* same hues, lightness +0.08 for each --stage-* and semantic token */ }
```
Brand overrides are injected at runtime by `(app)/layout.tsx` as a `<style>` element from `brandTokens()` (§9.12). Radius: sm `0.375rem`, md `0.625rem` (default), lg `0.875rem`.

### 15.3 Typography, density, motion
Fonts: Geist (sans), Geist Mono; numeric table cells `tabular-nums`. Base app text `text-sm`.
Scale: page title `text-xl font-semibold`; record title `text-2xl font-semibold`; section title `text-sm font-medium`; meta `text-xs text-muted-foreground`.
Density: toolbar controls `size="sm"` (h-8); table rows h-10; cards `p-4`; page padding `px-6 py-4` (≥ md) / `px-4 py-3` (< md); section gap `gap-4`, control gap `gap-2`; forms `max-w-2xl`; tables full width.
Motion: shadcn defaults only; honor `prefers-reduced-motion`. Focus rings from tokens; never removed. Breakpoints: Tailwind defaults; mobile < `md` (768 px).

### 15.4 Composite components (≤ 250 lines each; no data fetching; receive translated strings)
`AppShell`, `AppSidebar`, `AppHeader`, `BrandLogo`, `PageHeader`, `EmptyState`, `ErrorState`, `TableSkeleton`, `DataTable` (TanStack v9: columns, server pagination, sorting, selection, column visibility),
`FilterBar`, `ViewSwitcher`, `SavedViewMenu`, `BulkActionBar`, `KanbanBoard` (pragmatic dnd; collapsed terminal columns; touch fallback), `StagePill`, `StageSelect`, `PriorityIcon`, `UserAvatar`,
`AvatarStack` (3 + count), `UserPicker`, `RecordPicker`, `DateField` (popover + calendar), `MoneyField`, `CustomFieldsForm`, `RecordPageLayout`, `ActivityFeed`, `CommentComposer` (mentions via command popover),
`AttachmentList`, `NotificationBell`, `CommandMenu`, `ConfirmDialog`, `TaskSheet`, `CalendarMonth` (own month grid), `GanttView` (Phase 3 wrapper around SVAR), `MarkdownLite`.
Priority icons: none `lucide:Minus`, low `lucide:SignalLow`, medium `lucide:SignalMedium`, high `lucide:SignalHigh`, urgent `lucide:CircleAlert`.

---

## 16. App shell & sidebar

### 16.1 Structure
`SidebarProvider` (default open; persisted state as implemented by the shadcn sidebar) → `AppSidebar` (`variant="inset"`, `collapsible="icon"`, `--sidebar-width` 16rem, mobile 18rem offcanvas sheet) + `SidebarInset` → `AppHeader` + `<main>`.

### 16.2 Sidebar content (top to bottom)
**SidebarHeader:** `BrandLogo` (settings logo at 24 px, else a letter tile using `--sidebar-primary`) + `appName` (truncate); collapsed shows logo only with tooltip.
| Group | Item | Icon | Route | Visible when | Badge |
|---|---|---|---|---|---|
| (none) | Dashboard | `lucide:LayoutDashboard` | `/` | always | — |
| (none) | My tasks | `lucide:CircleCheckBig` | `/my-tasks` | module work | overdue count (destructive variant) if > 0 |
| (none) | Inbox | `lucide:Inbox` | `/inbox` | module mail, Phase 2 | unread inbound count |
| CRM (label from terminology, key `nav.crm`) | Leads | `lucide:UserPlus` | `/leads` | module crm | unassigned lead count |
| CRM | Deals | `lucide:Handshake` | `/deals` | module crm | — |
| CRM | Organizations | `lucide:Building2` | `/organizations` | module crm | — |
| CRM | Contacts | `lucide:Contact` | `/contacts` | module crm | — |
| Work | Projects | `lucide:FolderKanban` | `/projects` | module work | — |
| Work | Tasks | `lucide:ListTodo` | `/tasks` | module work | — |
| Work | Calendar | `lucide:CalendarDays` | `/calendar` | module work | — |
| Work | Timeline | `lucide:ChartGantt` | `/timeline` | module work, Phase 3 | — |
| Pinned | pinned SavedViews (≤ 8) | table `lucide:Table2`, board `lucide:Columns3`, calendar `lucide:CalendarDays`, timeline `lucide:ChartGantt` | view route | has pinned views | — |
**SidebarFooter:** Settings (`lucide:Settings`, `/settings/general`, manager_up) · user menu trigger (`UserAvatar`, name, email, `lucide:ChevronsUpDown`) opening a DropdownMenu:
Profile (`lucide:User`, `/settings/profile`), Notifications (`lucide:Bell`, `/settings/notifications`), Theme submenu (`lucide:Sun` Light, `lucide:Moon` Dark, `lucide:Monitor` System), Language (`lucide:Languages`: en, es), Keyboard shortcuts (`lucide:Keyboard`, dialog), Log out (`lucide:LogOut`).
`SidebarRail` enabled. Active item: exact match, or prefix match for detail routes. All labels via terminology/i18n.

### 16.3 Header (`AppHeader`: h-12, sticky top-0, border-b, bg-background)
Left: `SidebarTrigger` · vertical `Separator` · `Breadcrumb` (section › record title; ≤ 3 levels; titles truncated at 32 chars).
Right: Search button (`lucide:Search`, "Search", `Kbd` ⌘K; ≥ md) → `CommandMenu` · Create DropdownMenu (`lucide:Plus`): new lead, deal, organization, contact, project, task (filtered by modules and permission) → quick-create `Dialog` from `Layout.quickCreateFields` ·
`NotificationBell` (`lucide:Bell`; popover `w-96`; tabs Unread/All; 20 items; "Mark all read"; click → record; badge polls 60 s).
Mobile (< md): trigger, page title, Create (icon only), bell.

### 16.4 Command menu (⌘K / Ctrl+K)
Groups: Navigation (visible sidebar items) · Create (same as Create menu) · Records (`/api/v1/search`, debounce 200 ms) · Preferences (theme, language).

### 16.5 Keyboard shortcuts
`⌘/Ctrl+K` command menu · `⌘/Ctrl+B` toggle sidebar · `/` focus page search · `n` new record on list pages · `Esc` close sheet/dialog · `?` shortcuts dialog. Ignored while focus is in an editable field.

---

## 17. Pages
Every page: `loading.tsx` skeleton matching layout; `error.tsx` with `ErrorState` + retry; `not-found.tsx`; no-access `ErrorState`; strings via next-intl; URL state via nuqs; `<title>` = `{page} · {appName}`.
Root layout `generateMetadata` sets `icons: { icon: '/api/v1/brand/favicon' }`.

### 17.1 Auth (centered card `max-w-sm`, BrandLogo, appName)
| Route | Content | States |
|---|---|---|
| `/login` | email, password, "Forgot password?" link, submit → `/api/v1/auth/login` | invalid credentials; locked (minutes remaining); deactivated; `?next=` redirect |
| `/forgot-password` | email → `/api/v1/auth/forgot-password` | always "If an account exists, we sent a link" |
| `/reset-password?token=` | new password + confirm (D-46), strength hint → `/api/v1/auth/reset-password` | invalid or expired token |
| `/invite/[token]` | workspace name, role, inviter; name, password, confirm → `/api/v1/invitations/accept` | expired, revoked, already accepted (link to login) |

### 17.2 Onboarding `/onboarding` (owner while `settings.onboardedAt` is empty; others redirect to `/`)
Stepper (vertical left on ≥ md, top on mobile); each step saves on Continue; Back allowed.
1 **Workspace** (required): appName, timezone (default browser), locale, currency, week start.
2 **Branding** (skippable): logo (png/svg/webp ≤ 1 MB), favicon, primary color (hex + 12 presets), radius; live preview of sidebar and button.
3 **Template** (required): cards per template (§18) with modules and stage previews → `applyTemplate`.
4 **Team** (skippable): rows of email + role + group (≤ 20 rows) and group quick-create → invitations.
5 **Lead intake** (skippable, module intake): create form `website`, allowed origins, show endpoint URL, HTML snippet (form + Turnstile widget), fetch snippet, server-key snippet, and the inbound address for alias `leads` (§14.4).
6 **Import** (optional): link to `/settings/import`.
7 **Done**: checklist (sender verified, team invited, intake connected, first record) → sets `onboardedAt` → `/`.

### 17.3 Dashboard `/`
Grid `md:grid-cols-2 xl:grid-cols-3`. Cards: **My overdue** (count + 5 rows) · **Due this week** (5 rows) · **New leads, 7 days** (count + CSS bar per source) · **Pipeline** (open deal stages: count + summed value as CSS bars; staff scoped) · **Stalled** (5 rows) · **Recent activity** (10 entries; manager_up team-wide, staff scoped). Each card: title, "View all" link, empty text.

### 17.4 My tasks `/my-tasks`
Header: title, switch "Include tasks I created" (`mine=assigned|created`), quick-add input (title + Enter → task assigned to me, default workflow, no due date).
Sections (collapsible, with counts): Overdue, Today, Next 7 days, Later, No due date. Row: complete checkbox (`completeTask`, optimistic, undo toast 5 s), title (opens `TaskSheet` via `?task=`), context chip (project or related record), `PriorityIcon` (click → select), inline `DateField`, `AvatarStack`.
Empty: "Nothing assigned to you" + New task.

### 17.5 List pages — `/leads`, `/deals`, `/organizations`, `/contacts`, `/projects`, `/tasks`
`PageHeader`: plural label + total · `SavedViewMenu` (default, personal, shared; Save as, Update, Pin) · `ViewSwitcher` (Table | Board; Board only for workflow types) · New button.
`FilterBar`: search (debounce 300 ms) · Stage (multi) · Owner (multi, "Me") · Assignee (where applicable) · Source (leads, deals) · Created date range · Clear. URL keys: `q, stage, owner, assignee, source, from, to, sort, page, view`.
**Table:** checkbox column; columns below; sortable core-field headers; row click → record; sticky header; pagination 50. Selection → `BulkActionBar`: Assign owner, Add assignee, Change stage, Delete (manager_up, `ConfirmDialog`).
**Board:** columns = workflow stages by position; header: color dot, name, count (deals: summed value); terminal columns collapsed to 48 px (vertical label + count) with expand toggle; cards: title, 2 key fields, owner avatar, due or expected close.
Drag between columns → `changeStage` (lead/deal into `done_failure` opens the lost-reason dialog first); drag within a column → `rank`; conflict → toast + refresh.
On touch or coarse pointers and below `md`: drag is disabled; each card shows a `DropdownMenu` "Move to…" listing stages; columns scroll horizontally with snap.
| Type | Default table columns |
|---|---|
| leads | Title, Stage, Owner, Source, Email, Phone, Created |
| deals | Title, Stage, Value, Organization, Owner, Expected close |
| organizations | Name, Website, Owner, Open deals, Updated |
| contacts | Name, Organization, Email, Phone, Owner |
| projects | Name, Stage, Organization, Owner, Target end, Open tasks |
| tasks | Title, Stage, Priority, Assignees, Due, Project/Related |
Empty state per type: the type's sidebar icon, one sentence, New button; leads also link "Connect a website form" (`/settings/intake`).

### 17.6 Record pages — `/leads/[id]`, `/deals/[id]`, `/organizations/[id]`, `/contacts/[id]`, `/projects/[id]`
`RecordPageLayout` header: breadcrumb, inline-editable title, `StageSelect` (workflow types), owner `UserPicker`, actions DropdownMenu.
Body `lg:grid-cols-[1fr_320px]`. **Main** tabs: Activity (default; `CommentComposer` above `ActivityFeed` merged with comments, newest first, 30 + load more) · Tasks (related tasks + add) · Files (`AttachmentList` + upload) · Emails (module mail; thread + compose in Phase 2).
**Aside:** Details (from `Layout.sidebarFields`, inline edit) · Custom fields (`CustomFieldsForm`) · Relations · Meta (created by/at, updated, stage entered, time in stage). Mobile: aside becomes an accordion above the tabs.
| Type | Actions | Relations card | Extra |
|---|---|---|---|
| lead | Convert (`ConvertLeadDialog`: organization existing/new/none, contact existing/new, deal title/value), Mark lost, Delete | Organization, converted deal | Converted banner; stage read-only after conversion |
| deal | Mark won, Mark lost, Delete | Organization, Contacts (add/remove, primary star), Source lead | Value + probability |
| organization | Delete | Contacts, Deals, Projects | — |
| contact | Delete | Organization, Leads, Deals | Copy buttons for email/phone |
| project | Archive, Delete | Organization, Members | Main tabs: Overview (description + activity), Board, List, Timeline (Phase 3), Files |

### 17.7 Task sheet & page
`TaskSheet` (`Sheet side="right"`, `w-[560px]`, full screen on mobile) opens from `?task=<id>` on any page; `/tasks/[id]` renders the same content as a page.
Content: inline title, stage, priority, assignees, start/due, project or related picker, description (markdown-lite textarea + preview toggle), subtasks (list + add + progress x/y), attachments, activity + comments. Footer: Complete/Reopen, Delete (manager_up or creator within 24 h).

### 17.8 Calendar `/calendar`
`CalendarMonth` grid; tasks by `dueAt` (colored by priority), deals by `expectedCloseAt` (scoped). Filters: type, assignee. Click opens the sheet or record. Week start from settings.

### 17.9 Timeline `/timeline` and project Timeline tab (Phase 3)
`GanttView`: rows grouped by project; bars start → due (start defaults to due − 1 day); today marker; week/month zoom; drag/resize → `setTaskDates`; dependencies in Phase 3.

### 17.10 Inbox `/inbox` (Phase 2)
Two panes: thread list (record title, from, subject, time, unread dot) and thread view with reply composer (`sendRecordEmail`). Filters: Assigned to me · All (manager_up) · Quarantined (manager_up).

### 17.11 Notifications
Bell popover only; clicking an item marks it read and navigates.

### 17.12 Settings `/settings/*` (left sub-nav `w-56` on ≥ md; `Select` on mobile)
| Route | Who | Content |
|---|---|---|
| `/settings/general` | owner edits; manager reads | appName, timezone, locale, currency, week start, stalled days |
| `/settings/branding` | owner | logo, favicon, primary color, radius, live preview |
| `/settings/modules` | owner | switches crm/work/intake/mail with dependency notes |
| `/settings/terminology` | manager_up | record type, singular, plural, reset |
| `/settings/members` | manager_up | table: name, email, role, groups, reports to, status; Invite dialog (email, role, groups, reports to); row menu: change role, deactivate/reactivate, resend/revoke invitation |
| `/settings/groups` | manager_up | CRUD groups and members |
| `/settings/workflows` | manager_up | tabs per record type; stages with drag order, name, category, color, probability (deals), default; add/delete (delete asks for target stage) |
| `/settings/fields` | manager_up | tabs per record type; drag order; add/edit dialog (label, auto key, type, required, options, visibility, sensitive); hide with confirmation |
| `/settings/views` | manager_up | shared views: rename, set default, delete |
| `/settings/intake` | manager_up | forms table; editor for §10.3 fields; server key generate/revoke (shown once); snippets; last 50 submissions with status |
| `/settings/email` | owner | sender status + verification steps, from name/address, inbound addresses, quarantine list (release/delete), send test email |
| `/settings/notifications` | self | per-type in-app/email switches, digest time |
| `/settings/import` | manager_up | download CSV column templates per record type (core fields + field definitions), import rules (contacts/leads upsert by email; organizations by name), link to Payload admin Import (`@payloadcms/plugin-import-export`, `disableJobsQueue: true`, CSV ≤ 5 MB); imports run through collection hooks (§11.2) |
| `/settings/profile` | self | name, avatar, change password (`/api/v1/auth/change-password`) |

### 17.13 Payload admin `/admin`
Owner/manager only; branded via `admin.components.graphics.Logo/Icon` reading settings; `admin.meta.titleSuffix` = ` · {appName}`; collection groups: People, Records, Configuration, System. For data repair and imports, not daily work.

---

## 18. Vertical templates (`@ops/templates`)
Each template: `key`, `version: 1`, modules, terminology, workflows (stage · category · color [· probability]), fields, views, sources, lost reasons, `sensitive`.

### 18.1 `agency` (first customer: Mirch Media)
Modules: crm, work, intake, mail. Terminology: defaults. `sensitive: false`.
| Workflow | Stages |
|---|---|
| lead | New · open · blue / Contacted · active · amber / Qualified · active · violet / Converted · done_success · green / Disqualified · done_failure · red |
| deal | Discovery · active · blue · 10 / Proposal sent · active · amber · 40 / Negotiation · waiting · violet · 70 / Won · done_success · green · 100 / Lost · done_failure · red · 0 |
| project | Planned · backlog · gray / In progress · active · blue / On hold · waiting · amber / Delivered · done_success · green / Cancelled · cancelled · gray |
| task | Backlog · backlog · gray / To do · open · blue / In progress · active · amber / Review · waiting · violet / Done · done_success · green |
Fields: lead `service` (select: Website, SEO, Social media, Design, App development, Ads), `budget` (select: Under $1k, $1k–5k, $5k–20k, $20k+); deal `serviceLines` (multiSelect, same options); project `retainer` (checkbox), `department` (select: Design, Development, Social, SEO).
Views: Leads table (non-terminal stages, default), Deals board (default), Projects board, Tasks board; shared "Unassigned leads" (`ownerId` not exists).
Sources: Website form, Referral, Ads, Social, Email, Phone/walk-in. Lost reasons: Budget, Timing, No response, Chose competitor, Not a fit.

### 18.2 Other templates (built when a client needs them, D-48)
| Key | Terminology | Lead stages | Deal-equivalent stages | Custom fields | sensitive |
|---|---|---|---|---|---|
| `legal` | deal→Matter, organization→Firm client, project→Case file | New · open / Consultation booked · active / Consulted · waiting / Retained · done_success / Declined · done_failure | Intake · open / Treatment · active / Records requested · waiting / Attorney review · active / Settled · done_success / Closed, no recovery · done_failure | lead `caseType` (select, sensitive), `incidentDate` (date, sensitive), `language` (select en/es) | true |
| `home-inspection` | deal→Booking, project→Inspection | New · open / Quoted · active / Booked · done_success / Lost · done_failure | Scheduled · open / Inspected · active / Report sent · done_success / Cancelled · cancelled | `propertyAddress` (text), `inspectionType` (select), `sqft` (number) | false |
| `health` | deal→Appointment, contact→Client | New · open / Contacted · active / Booked · done_success / Not booked · done_failure | Scheduled · open / Attended · done_success / No-show · done_failure / Cancelled · cancelled | `serviceType` (select), `preferredLocation` (select); no clinical fields allowed | true |
| `accounting` | deal→Engagement | New · open / Discovery call · active / Proposal · waiting / Engaged · done_success / Lost · done_failure | Onboarding · open / In progress · active / Filed · done_success | `entityType` (select), `taxYear` (number) | false |
| `real-estate` | deal→Transaction, contact→Client | New · open / Contacted · active / Showing · active / Offer · waiting / Closed · done_success / Lost · done_failure | same as lead flow after Offer | `side` (select buyer/seller), `budget` (currency), `area` (text) | false |
| `travel` | deal→Trip | New · open / Quoted · active / Booked · done_success / Lost · done_failure | Planning · open / Confirmed · active / Travelled · done_success / Cancelled · cancelled | `destination` (text), `travelDates` (text), `travellers` (number) | false |
| `education` | deal→Enrollment | Inquiry · open / Applied · active / Enrolled · done_success / Not enrolled · done_failure | Registered · open / Attending · active / Completed · done_success / Withdrawn · cancelled | `program` (select), `startTerm` (select) | false |
Colors for other templates: open blue, active amber, waiting violet, done_success green, done_failure red, cancelled gray, backlog gray. Project and task workflows: same as `agency`.

---

## 19. Tenancy, provisioning & deployment

### 19.1 `tenants/<slug>.jsonc` (zod-validated)
```jsonc
{
  "slug": "mirchmedia", "displayName": "Mirch Media", "host": "mirchmedia.<PLATFORM_DOMAIN>", "hostType": "platform",   // "platform" (default) | "custom" (D-49)
  "template": "agency", "timezone": "America/New_York", "locale": "en", "currency": "USD",
  "owner": { "email": "<owner email>", "name": "<owner name>" },
  "email": { "fromName": "Mirch Media", "fromAddress": "no-reply@notify.<PLATFORM_DOMAIN>", "inboundDomain": "in.<PLATFORM_DOMAIN>", "inboundLocalPrefix": "mirchmedia--" },
  "d1": { "name": "ops-mirchmedia", "id": "<written by provision>" },
  "r2": { "bucket": "ops-mirchmedia" },
  "rateLimitNamespaces": { "intake": "1001", "auth": "1002" },   // unique positive integers per account: 1000 + deployOrder*10 + n
  "intake": { "allowedOrigins": ["https://www.mirchmedia.com", "https://web.mirchmedia.com"], "turnstileHostnames": ["www.mirchmedia.com", "web.mirchmedia.com"] },
  "deployOrder": 0
}
```

### 19.2 `scripts/gen-wrangler.ts`
Generates `apps/web/wrangler.jsonc`: base config (main `worker.ts`, `compatibility_date` from the template, `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`, assets `.open-next/assets`, observability enabled) with **no** tenant bindings,
and one `env.<slug>` per tenant: `name: ops-<slug>`, `routes: [{ pattern: host, custom_domain: true }]`, `d1_databases` (binding `D1`), `r2_buckets` (binding `R2`), `send_email: [{ name: "EMAIL" }]`,
`services: [{ binding: "WORKER_SELF_REFERENCE", service: "ops-<slug>" }]`, `ratelimits` (`RATE_LIMIT_INTAKE`, `RATE_LIMIT_AUTH` with the tenant namespaces), `vars`, `triggers.crons: ["*/15 * * * *"]`.
Also generates `apps/mail-router/wrangler.jsonc` with one service binding `TENANT_<SLUG>` per platform-hosted tenant.

### 19.3 `scripts/provision-tenant.ts <slug>` (idempotent; each step checks current state first)
1 validate `tenants/<slug>.jsonc` · 2 `wrangler d1 create ops-<slug>` → write id · 3 `wrangler r2 bucket create ops-<slug>` · 4 `gen-wrangler` ·
5 write a temporary JSON of generated secrets (`PAYLOAD_SECRET`, `INTERNAL_SECRET`, `TENANT_SECRET` = 32 random bytes base64url; `TURNSTILE_SECRET` from input) and run `wrangler secret bulk <file> --env <slug>`; delete the file ·
6 `pnpm --filter web exec payload migrate` with `CLOUDFLARE_ENV=<slug>` (remote bindings) · 7 `opennextjs-cloudflare deploy --env=<slug>` from the existing build ·
8 seed via internal authenticated route: settings from the tenant file, `applyTemplate`, owner invitation (email sent) · 9 read Email Service sender status → `senderStatus` ·
10 print the manual checklist: custom domain status; Email Routing subdomain + catch-all (§14.4) with dashboard path; Turnstile widget hostnames; platform-hosted tenants also redeploy `ops-mail-router` ·
11 smoke (`pnpm tenant:smoke <slug>`): `GET /api/v1/health`; `/login` 200; R2 put/get/delete probe via internal route; test email to the owner.

### 19.4 CI (`.github/workflows`)
`ci.yml` (pull requests): `pnpm install --frozen-lockfile` → `pnpm verify`.
`deploy.yml` (tags `v*`): build once → for tenants by `deployOrder`: record a restore point (`wrangler d1 time-travel info ops-<slug> --env <slug>` → bookmark) → migrate → `opennextjs-cloudflare deploy --env=<slug>` → smoke →
on failure: stop the loop; `wrangler rollback --name ops-<slug> --message "<tag> failed smoke"` (code only; rollback keeps bindings and data; ≤ 100 versions back); mark the job failed and print the recorded bookmark. Data restore is never automatic: restoring D1 with `wrangler d1 time-travel restore ops-<slug> --bookmark <bookmark> --env <slug>` is a human-approved runbook step (§0.3). Migrations must stay backward-compatible with the previous code version so a code rollback works without restoring data.

### 19.5 Isolation proof (M1 and M7)
Deploy `staging-a` and `staging-b` from one build; create a record in A; assert B's API and D1 cannot see it; inspect each Worker's bindings (only its own D1/R2); brand strings differ between the two.

---

## 20. Runbook: onboarding a customer tenant (`docs/runbooks/onboarding-customer.md`)
The platform operator owns and runs the platform; customers (agencies and service businesses) are tenants. Mirch Media is the first customer (§20.8) and is onboarded exactly like any other.

### 20.1 Platform prerequisites (platform operator, once; tick in the M8 report)
1 Cloudflare account owned by the platform operator with Workers Paid.
2 `PLATFORM_DOMAIN` registered by the platform operator and active on Cloudflare DNS in that account.
3 Email Sending onboarded for `notify.<PLATFORM_DOMAIN>`; Email Routing subdomain `in.<PLATFORM_DOMAIN>` with a catch-all rule → Worker `ops-mail-router` (§14.4).
4 API token scoped to: Workers Scripts edit, D1 edit, R2 edit, Email Service edit, Email Routing edit, DNS edit (`PLATFORM_DOMAIN` only).
5 GitHub organization of the platform operator with secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
6 One Turnstile widget per customer website group; its secret stored as `TURNSTILE_SECRET_<SLUG>`.

### 20.2 Customer prerequisites (per customer)
1 Owner name and email; team list (name, email, role, group, reports to).
2 Website origins that will submit leads, and access to each site's form handler (repository access or a person who can deploy a change).
3 CSV exports of current records (organizations, contacts, projects, open tasks, recent leads).
4 Branding assets (logo, favicon, primary color) and display name.
5 Template choice (§18); a `sensitive` template requires the privacy ADR (§23) before go-live.

### 20.3 Provision (lead, ~30 min)
Create `tenants/<slug>.jsonc` with `hostType: "platform"` → `pnpm tenant:provision <slug>` → regenerate and deploy `ops-mail-router` (the new slug gets its service binding) → `pnpm tenant:smoke <slug>`.

### 20.4 Customer owner setup (~45 min)
1 Accept the invitation and set a password.
2 Onboarding wizard (§17.2): workspace, branding, template, team, intake, done.
3 Import CSVs in `/admin` → Import using templates from `/settings/import`, in order: organizations → contacts → projects → open tasks → leads.
4 Send a test email from `/settings/email`.

### 20.5 Lead flow cutover (per customer website)
1 Point the site's lead handler at `https://<slug>.<PLATFORM_DOMAIN>/api/v1/intake/<formKey>`: server-to-server with `x-intake-key` (a server key generated in `/settings/intake`), or browser posts with Turnstile.
2 Keep the site's existing notification path during a 7-day overlap.
3 Submit a test lead from each site → it appears in `/leads` with its source and the notification arrives.
4 After 7 clean days, remove the old notification path.

### 20.6 Pilot week (first customer; evidence in `docs/reports/pilot-<slug>.md`)
- 100% of website leads land in the app (compare against form submission counts).
- All active projects and open tasks live in the app; no parallel sheet or task tool is updated during the week.
- Every staff member logs in on ≥ 3 of 5 workdays; My tasks is used daily.
- Zero cross-scope visibility bugs; due-soon and overdue notifications verified.
- Friction list collected → orders the Phase 2 backlog.

### 20.7 Rollback
The old notification path stays active until 20.5 step 4, so platform issues never block lead capture. Data restore is never automatic (§19.4; restore steps in `docs/runbooks/rollback.md`).

### 20.8 First customer: Mirch Media
| Item | Value |
|---|---|
| Slug / host | `mirchmedia` / `mirchmedia.<PLATFORM_DOMAIN>` |
| Template | `agency`; timezone `America/New_York`; currency USD; locale en |
| Groups | Sales, Design, Development, Social, SEO |
| Intake | form `website`; origins `https://www.mirchmedia.com`, `https://web.mirchmedia.com`; inbound alias `leads` |
| Sender | `"Mirch Media" <no-reply@notify.<PLATFORM_DOMAIN>>` (D-41) |
| Lead cutover | `mirchmedia-laravel` `POST /api/leads` (`routes/web.php`, `routes/api.php`) forwards server-to-server to `https://mirchmedia.<PLATFORM_DOMAIN>/api/v1/intake/website` with `x-intake-key` stored as a Laravel env secret; the Vue sites posting to `mirchmedia.com/api/leads` need no redeploy |
| Exports | recent leads from the `marketing@mirchmedia.com` inbox/Resend logs; active clients, projects, open tasks |

---

## 21. Milestones

### 21.1 Bootstrap commands (M0–M1)
```bash
mkdir ops-platform && cd ops-platform && git init
corepack enable && corepack prepare pnpm@10.34.5 --activate
printf '22\n' > .nvmrc
# create pnpm-workspace.yaml, package.json, .npmrc, tooling/* and eslint.config.js exactly as in §6.8
mkdir -p apps packages/modules packages/adapters tenants scripts docs
pnpm dlx create-payload-app@3.89.0 --help                         # confirm flags before running
pnpm dlx create-payload-app@3.89.0 -t with-cloudflare-d1          # template name verified; create it as apps/web (name "web"), pnpm, no git
# align apps/web dependencies to §4.1 with: pnpm --filter web add -E <package>@<version> …
# add apps/web/worker.ts (§13) and point wrangler "main" at it via scripts/gen-wrangler.ts
mkdir -p packages/ui && cd packages/ui && pnpm dlx shadcn@4.21.0 init && cd ../..
pnpm --filter web exec wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts
```
If `create-payload-app` cannot target `apps/web` directly, generate in a temporary directory and move it; record the procedure in `docs/reports/m0.md`.

### 21.2 Milestone table (execute in order; each ends with `pnpm verify` green and a report)
| M | Scope | Acceptance (all must pass) |
|---|---|---|
| **M0 Bootstrap** | §21.1; tooling §6; docs skeleton §7 incl. `docs/spec.md` = this file, ADR-0001/0002; empty packages with READMEs; `ci.yml` | `pnpm verify` green; `check:brand` fails on a planted "mirch" fixture; depcruise fails on a planted `modules → adapters` import; `check:disables` fails on a planted disable; harness self-test §26.9 passes |
| **M1 Spike** | Payload `with-cloudflare-d1` at pinned versions; collections users, groups, organizations, projects, tasks, workflows, activity, attachments, notifications, emailMessages, jobRuns, settings; access per §11.1 for those; minimal shadcn shell; TanStack v9 task table; board with `changeStage`; SVAR Gantt date drag; `worker.ts` `scheduled()` → one reminder email via `EMAIL`; `email()` → stored inbound message; two tenants `staging-a/b` from one build | `docs/reports/m1-spike.md`: bundle size; **startup time vs the 1 s Worker startup limit**; cold p50/p95; route p50/p95; CPU ms; D1 rows read/written per page; migration behavior; transaction result (D-36); `idType: 'uuid'` result; cookie helper name (§12); isolation proof §19.5; email out/in proof; duplicate cron run proof → **GO / FALLBACK** |
| **M2 Kernel + Platform** | §8, §9 with ports and unit tests | coverage thresholds; property tests for `rankBetween`/`rebalance` and `diffFields`; permission matrix test enumerates every §9.10 cell |
| **M3 Payload adapter** | §11 all collections, §11.1 access, §11.2 hooks, repositories, migrations | integration tests on local D1: scope filtering per role for every scoped collection; unique constraints; conflict detection; activity writes; admin-style update violating an invariant is rejected |
| **M4 CRM + Work** | §10.1, §10.2 | T-CRM, T-WORK |
| **M5 UI + pages** | §15, §16, §17 Phase 1 pages (auth, onboarding, dashboard, my tasks, CRM lists/records, projects, tasks, calendar, settings except inbox/email) | T-E2E-1..7; `@axe-core/playwright` reports no serious or critical violations per page; mobile (390 px) screenshots of shell, list, record, sheet attached to report |
| **M6 Intake + Mail** | §10.3, §10.4, §12 auth/intake routes, §13 jobs, §14, `/settings/intake`, `/settings/email`, `apps/mail-router` | T-INTAKE, T-MAIL, T-JOBS, T-E2E-8; real outbound + inbound round-trip on staging |
| **M7 Provisioning + Deploy** | §19 scripts, `deploy.yml`, runbooks | provision `staging-a` from scratch with one command; deploy loop stops on an injected smoke failure and rolls back; rollback runbook executed once |
| **M8 First customer onboarding** | §20 for Mirch Media (§20.8) | platform and customer prerequisites ticked; tenant live; a test lead from each Mirch site visible |
| **M9 Pilot hardening** | fixes from the first customer's pilot week only | §20.6 criteria met; report |
| **Phase 2** | saved-view polish, bulk actions, Sheets → CSV guide, Inbox page, record email compose, dashboard polish; **LMPM** tenant (`legal`) after a privacy ADR | Definition of Done §23 per feature |
| **Phase 3** | Timeline/Gantt + dependencies, recurring tasks, SLAs, assignment rules, custom-field filtering, FTS5, rich text, transition rules | §23 per feature |
| **Phase 4** | client portal, telephony/WhatsApp, ad-platform lead sync, forecasting, live updates, time tracking, PWA | ADR each |


### 21.3 Work package plans
Columns: WP id · owner · wave (0 = contracts before any worker) · dependencies · objective · write scope (`;`-separated; a trailing `/` means the directory) · acceptance.
These tables are the default decomposition; M2–M9 are provisional until the M1 spike report, after which the lead re-plans (§0.10). Rules: parallel write scopes are disjoint within a wave; worker scopes never overlap lead scopes of the same milestone or §0.7 paths; dependencies always point to earlier waves.

#### M0 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M0-L1 | Lead | 0 | — | Bootstrap per §21.1: root configs and tooling (§6.8), harness config, schemas and templates (§26.2), docs skeleton (§7.1) with `docs/spec.md` and ADR-0001/0002, all package skeletons (package.json, tsconfig.json, src/index.ts, README.md), `apps/mail-router` skeleton, `apps/web` scaffold | `package.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `.npmrc`; `.nvmrc`; `.prettierrc.json`; `eslint.config.js`; `vitest.config.ts`; `playwright.config.ts`; `tooling/`; `harness/`; `docs/`; `packages/`; `apps/` | `pnpm install --frozen-lockfile` and `pnpm typecheck` succeed |
| M0-W1 | Worker | 1 | M0-L1 | Implement `check-brand`, `check-vocab`, `check-disables`, `check-docs`, `check-size`, `check-scope` scripts (§6.5, §0.7) with unit tests and planted fixtures | `scripts/check-brand.ts`; `scripts/check-vocab.ts`; `scripts/check-disables.ts`; `scripts/check-docs.ts`; `scripts/check-size.ts`; `scripts/check-scope.ts`; `scripts/test/checks/`; `scripts/fixtures/checks/` | `pnpm vitest run scripts/test/checks` passes; each planted fixture makes its check fail |
| M0-W2 | Worker | 1 | M0-L1 | CI workflow running `pnpm install --frozen-lockfile` and `pnpm verify` on pull requests | `.github/workflows/ci.yml` | CI run green on the M0 branch |
| M0-W3 | Worker | 1 | M0-L1 | Core harness scripts §26.10 (`plan`, `brief`, `record`, `retro`, `evals`) with JSON schema validation, parallel-safe attempt files and lesson ids, unit tests | `scripts/harness/`; `scripts/test/harness/` | `pnpm vitest run scripts/test/harness` passes; `pnpm harness:brief M0-W1` prints every §0.5 field |
| M0-L2 | Lead | 2 | M0-W1, M0-W2, M0-W3 | Wire scripts into root `package.json`, run planted-failure acceptance and the §26.9 harness self-test, M0 report, first retro | `package.json`; `docs/reports/`; `harness/selftest/`; `harness/lessons/`; `harness/evals/` | §21.2 M0 row |

#### M1 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M1-L1 | Lead | 0 | — | Spike foundation: align `apps/web` to §4.1, `worker.ts`, `payload.config.ts` (D1, R2, auth §11.2, email adapter stub), remove template sample files, `gen-wrangler.ts` with tenants `staging-a` and `staging-b`, shadcn init + every §15.1 component + tokens §15.2, kernel contracts and minimal kernel lib (Result, DomainError, Clock, Logger), platform contracts (RecordRef, Workflow/Stage, Actor, `changeStage`, `can`, `scopeFilter`, MailSender, UnitOfWork), app layout shell slot | `apps/web/package.json`; `apps/web/worker.ts`; `apps/web/next.config.ts`; `apps/web/open-next.config.ts`; `apps/web/.dev.vars.example`; `apps/web/tsconfig.json`; `apps/web/src/payload.config.ts`; `apps/web/src/collections/`; `apps/web/src/app/(frontend)/`; `apps/web/src/app/my-route/`; `apps/web/src/app/(payload)/`; `apps/web/src/app/layout.tsx`; `apps/web/src/app/(app)/layout.tsx`; `apps/web/src/proxy.ts`; `apps/web/src/server/container.ts`; `apps/web/src/server/session.ts`; `apps/web/src/i18n/request.ts`; `scripts/gen-wrangler.ts`; `tenants/`; `packages/kernel/src/contracts/`; `packages/kernel/src/lib/`; `packages/kernel/src/index.ts`; `packages/platform/src/contracts/`; `packages/platform/src/index.ts`; `packages/ui/package.json`; `packages/ui/components.json`; `packages/ui/src/components/ui/`; `packages/ui/src/styles/`; `packages/ui/src/index.ts`; `pnpm-lock.yaml`; `docs/orchestration/m1/` | `pnpm build` succeeds; `pnpm --filter web exec wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts` succeeds |
| M1-L2 | Lead | 1 | M1-L1 | Spike policy and consistency: `can` + `scopeFilter` (§9.10 subset), FilterNode → Payload Where converter, §11.1 access functions for the spike collections, UnitOfWork adapter with a transaction-support probe (D-36), `changeStage` command | `packages/platform/src/permissions/`; `packages/platform/src/workflows/`; `packages/adapters/payload/src/where/`; `packages/adapters/payload/src/access/`; `packages/adapters/payload/src/uow/`; `packages/adapters/payload/test/uow/` | unit tests pass; probe result written to the M1 plan notes |
| M1-W1 | Worker | 1 | M1-L1 | Spike collections users, groups, organizations, projects, tasks, workflows, activity, attachments, notifications, emailMessages, jobRuns and the settings global, wired to the lead's §11.1 access functions | `packages/adapters/payload/src/collections/` | `pnpm --filter web build` succeeds; collections load in `/admin` on `pnpm dev` |
| M1-W2 | Worker | 1 | M1-L1 | Spike UI: AppShell, AppSidebar, AppHeader, DataTable (TanStack v9), PageHeader, EmptyState, ErrorState, TableSkeleton composites; `/tasks` list page reading tasks through an RSC query | `packages/ui/src/composites/AppShell/`; `packages/ui/src/composites/AppSidebar/`; `packages/ui/src/composites/AppHeader/`; `packages/ui/src/composites/DataTable/`; `packages/ui/src/composites/PageHeader/`; `packages/ui/src/composites/EmptyState/`; `packages/ui/src/composites/ErrorState/`; `packages/ui/src/composites/TableSkeleton/`; `apps/web/src/app/(app)/tasks/page.tsx`; `apps/web/src/app/(app)/tasks/loading.tsx`; `apps/web/src/app/(app)/tasks/error.tsx`; `apps/web/src/server/queries/work/tasks/` | `pnpm typecheck` and `pnpm lint` pass; `/tasks` renders seeded tasks on `pnpm dev` |
| M1-W3 | Worker | 1 | M1-L1 | Spike background work: `dispatchCron`, `bridgeInboundEmail`, `CloudflareMailSender`, `ConsoleMailSender`, internal cron and inbound routes guarded by `x-internal-secret`, one due-soon reminder job with notification dedupe key | `packages/adapters/cloudflare/src/cron/`; `packages/adapters/cloudflare/src/mail/`; `packages/adapters/cloudflare/src/inbound/`; `packages/adapters/cloudflare/test/`; `apps/web/src/app/api/v1/internal/` | unit tests pass; running the job twice creates one notification |
| M1-W4 | Worker | 2 | M1-L2, M1-W2 | Spike board: KanbanBoard composite (pragmatic drag and drop), `/tasks/board` page, `moveTask` server action calling `changeStage` with `expectedUpdatedAt` | `packages/ui/src/composites/KanbanBoard/`; `apps/web/src/app/(app)/tasks/board/`; `apps/web/src/server/actions/work/tasks/moveTask.ts` | drag persists the stage; a stale `expectedUpdatedAt` returns CONFLICT |
| M1-W5 | Worker | 2 | M1-W2 | Spike timeline: GanttView wrapper (SVAR MIT edition), `/timeline` page, `setTaskDates` server action | `packages/ui/src/composites/GanttView/`; `apps/web/src/app/(app)/timeline/`; `apps/web/src/server/actions/work/tasks/setTaskDates.ts` | dragging a bar persists `startAt`/`dueAt` |
| M1-L3 | Lead | 3 | M1-L2, M1-W1, M1-W3, M1-W4, M1-W5 | Integrate: barrels, layout composition, migration, deploy `staging-a` and `staging-b` from one build, isolation proof §19.5, outbound + inbound email proof, D-36 decision | `apps/web/src/migrations/`; `apps/web/src/payload-types.ts`; `apps/web/src/app/(app)/layout.tsx`; `packages/platform/src/index.ts`; `packages/adapters/payload/src/index.ts`; `packages/adapters/cloudflare/src/index.ts`; `packages/ui/src/index.ts`; `docs/decisions/` | both tenants live; isolation and email evidence recorded |
| M1-W6 | Worker | 4 | M1-L3 | Spike tests: permission scope per role on local D1, stale-version conflict, duplicate cron run, Playwright smoke (login, tasks table, board drag, timeline drag) | `packages/adapters/payload/test/spike/`; `tests/e2e/spike/` | `pnpm test` and `pnpm test:e2e --grep spike` pass |
| M1-W7 | Worker | 4 | M1-L3 | Measurements on `staging-a`: `startup_time_ms` from `wrangler versions upload` output (5 uploads); cold first-request latency after each of those 5 deploys; warm p50/p95 over 200 sequential requests for `/login`, `/tasks`, `/api/v1/health` and the board action via `curl -w '%{time_total}'`; CPU time p50/p99 from GraphQL dataset `workersInvocationsAdaptive` (`quantiles { cpuTimeP50 cpuTimeP99 }`, filter `scriptName`); D1 rows read/written from query result `meta`; R2 operations from the probe route; bundle size from `pnpm size` | `scripts/spike/`; `docs/spike-data/` | raw data files committed; re-running the scripts reproduces medians within ±20% |
| M1-L4 | Lead | 5 | M1-W6, M1-W7 | Spike report per §0.9 with GO or FALLBACK, retro | `docs/reports/`; `harness/lessons/`; `harness/evals/`; `docs/decisions/` | §21.2 M1 row |

#### M2 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M2-L1 | Lead | 0 | — | Freeze full platform contracts (§9 types, ports, RecordTypeDefinition, EventBus, UnitOfWork) and kernel signatures (§8) | `packages/platform/src/contracts/`; `packages/kernel/src/contracts/`; `docs/orchestration/m2/` | `pnpm typecheck` |
| M2-L2 | Lead | 1 | M2-L1 | Complete permissions policy §9.10 including sensitive fields and scope extensions | `packages/platform/src/permissions/` | unit tests for every role path pass |
| M2-W1 | Worker | 1 | M2-L1 | Kernel implementations §8 with unit and property tests | `packages/kernel/src/lib/`; `packages/kernel/test/` | kernel coverage 95/90; T-PLAT-13 |
| M2-W2 | Worker | 1 | M2-L1 | Workflows and stages domain + `changeStage` command §9.4 | `packages/platform/src/workflows/`; `packages/platform/test/workflows/` | T-PLAT-1..5 |
| M2-W3 | Worker | 1 | M2-L1 | Record registry §9.1, terminology §9.2, field definitions §9.3, templates schema and `applyTemplate` §9.11 | `packages/platform/src/registry/`; `packages/platform/src/terminology/`; `packages/platform/src/fields/`; `packages/platform/src/templates/`; `packages/platform/test/registry/`; `packages/platform/test/terminology/`; `packages/platform/test/fields/`; `packages/platform/test/templates/` | T-PLAT-6, T-PLAT-11 |
| M2-W4 | Worker | 1 | M2-L1 | Activity §9.5, comments §9.6, attachments domain §9.7, notifications §9.8 | `packages/platform/src/activity/`; `packages/platform/src/comments/`; `packages/platform/src/attachments/`; `packages/platform/src/notifications/`; `packages/platform/test/activity/`; `packages/platform/test/comments/`; `packages/platform/test/attachments/`; `packages/platform/test/notifications/` | T-PLAT-7 |
| M2-W5 | Worker | 1 | M2-L1 | Views and layouts §9.9, settings and brand tokens §9.12, in-process event bus §9.13 | `packages/platform/src/views/`; `packages/platform/src/layouts/`; `packages/platform/src/settings/`; `packages/platform/src/events/`; `packages/platform/test/views/`; `packages/platform/test/settings/`; `packages/platform/test/events/` | T-PLAT-12 |
| M2-W6 | Worker | 2 | M2-L2 | Permission matrix tests enumerating every §9.10 cell plus scope tests | `packages/platform/test/permissions/` | T-PLAT-8, 9, 10, 14 |
| M2-L3 | Lead | 3 | M2-W1, M2-W2, M2-W3, M2-W4, M2-W5, M2-W6 | Review, reconcile, barrels and READMEs, `pnpm verify`, report, retro | `packages/platform/src/index.ts`; `packages/platform/README.md`; `packages/kernel/src/index.ts`; `packages/kernel/README.md`; `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M2 row |

#### M3 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M3-L1 | Lead | 0 | — | Freeze adapter contracts (repository list, collection naming and field conventions, `registerRecordHooks`, access factory); complete Where converter, UnitOfWork per D-36 and access factory | `packages/adapters/payload/src/contracts/`; `packages/adapters/payload/src/where/`; `packages/adapters/payload/src/uow/`; `packages/adapters/payload/src/access/`; `docs/orchestration/m3/` | `pnpm typecheck`; converter unit tests pass |
| M3-L2 | Lead | 1 | M3-L1 | Auth hooks: `beforeLogin` inactive block, last-active-owner invariant, forgot-password configuration | `packages/adapters/payload/src/hooks/auth/` | unit tests pass (T-AUTH-1, T-AUTH-5 run in M3-W6) |
| M3-W1 | Worker | 1 | M3-L1 | Collections users, groups, invitations, settings global, fieldDefinitions, workflows, savedViews, layouts (§11, §11.1 via access factory) | `packages/adapters/payload/src/collections/people/`; `packages/adapters/payload/src/collections/config/` | `pnpm --filter web build` succeeds |
| M3-W2 | Worker | 1 | M3-L1 | Collections organizations, contacts, leads, deals, sources, lostReasons, projects, tasks | `packages/adapters/payload/src/collections/records/` | `pnpm --filter web build` succeeds |
| M3-W3 | Worker | 1 | M3-L1 | Collections stageTransitions, activity, comments, attachments (R2 upload), notifications, notificationPrefs, intakeForms, intakeSubmissions, emailMessages, jobRuns | `packages/adapters/payload/src/collections/system/` | `pnpm --filter web build` succeeds |
| M3-W4 | Worker | 2 | M3-W1, M3-W2, M3-W3 | Repositories implementing platform and module ports over the Local API, AND-ing scope filters, `overrideAccess: false` | `packages/adapters/payload/src/repositories/` | typecheck; repository unit tests with a fake Payload pass |
| M3-W5 | Worker | 2 | M3-W1, M3-W2, M3-W3 | Record hooks framework §11.2 (validators, activity diffs, stage bookkeeping, `canDelete`) registered for platform validators | `packages/adapters/payload/src/hooks/records/` | unit tests pass |
| M3-L3 | Lead | 3 | M3-L2, M3-W4, M3-W5 | Assemble collections into `payload.config.ts`, generate and apply the migration locally | `apps/web/src/payload.config.ts`; `apps/web/src/migrations/`; `apps/web/src/payload-types.ts`; `packages/adapters/payload/src/index.ts` | `payload migrate` succeeds on local D1 |
| M3-W6 | Worker | 4 | M3-L3 | Integration tests on local D1: scope per role for every scoped collection, unique constraints, conflict detection, activity writes, admin-style invariant violation rejected, T-AUTH-1, T-AUTH-5 | `packages/adapters/payload/test/integration/` | `pnpm test` passes for the adapter project |
| M3-L4 | Lead | 5 | M3-W6 | Review, `pnpm verify`, README, report, retro | `packages/adapters/payload/README.md`; `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M3 row |

#### M4 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M4-L1 | Lead | 0 | — | CRM and Work contracts: ports, events, zod schemas, record type registration shapes | `packages/modules/crm/src/ports/`; `packages/modules/crm/src/events/`; `packages/modules/crm/src/schema/`; `packages/modules/work/src/ports/`; `packages/modules/work/src/events/`; `packages/modules/work/src/schema/`; `docs/orchestration/m4/` | `pnpm typecheck` |
| M4-L2 | Lead | 1 | M4-L1 | `convertLead` command (§10.1) with unit-of-work and idempotency | `packages/modules/crm/src/conversion/`; `packages/modules/crm/test/conversion/` | T-CRM-1, 2, 4, 7 |
| M4-W1 | Worker | 1 | M4-L1 | CRM domain, commands and queries except conversion (§10.1) | `packages/modules/crm/src/domain/`; `packages/modules/crm/src/commands/`; `packages/modules/crm/src/queries/`; `packages/modules/crm/test/domain/`; `packages/modules/crm/test/commands/` | T-CRM-3, 5, 6 |
| M4-W2 | Worker | 1 | M4-L1 | Work domain, commands and queries (§10.2) | `packages/modules/work/src/domain/`; `packages/modules/work/src/commands/`; `packages/modules/work/src/queries/`; `packages/modules/work/test/` | T-WORK-1..5 |
| M4-W3 | Worker | 2 | M4-L2, M4-W1, M4-W2 | Adapter registrations: record types, module validators into hooks, repositories for module ports | `packages/adapters/payload/src/registrations/`; `packages/adapters/payload/test/registrations/` | integration: creating a lead writes activity; conversion through the adapter passes |
| M4-L3 | Lead | 3 | M4-W3 | Barrels, READMEs, migration if schema changed, `pnpm verify`, report, retro | `packages/modules/crm/src/index.ts`; `packages/modules/crm/README.md`; `packages/modules/work/src/index.ts`; `packages/modules/work/README.md`; `packages/adapters/payload/src/index.ts`; `apps/web/src/migrations/`; `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M4 row |

#### M5 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M5-L1 | Lead | 0 | — | UI contracts: composite prop types, nav model builder (modules + permissions + terminology), route map, `ActionResult` and §12.1 error mapping helper, i18n namespace loader, brand token injection | `packages/ui/src/contracts/`; `apps/web/src/app/(app)/layout.tsx`; `apps/web/src/app/layout.tsx`; `apps/web/src/server/container.ts`; `apps/web/src/server/session.ts`; `apps/web/src/server/action-result.ts`; `apps/web/src/i18n/request.ts`; `docs/orchestration/m5/` | `pnpm typecheck` |
| M5-L2 | Lead | 1 | M5-L1 | Auth and invitation routes (§12), password policy D-46, blocked Payload auth routes in `proxy.ts` | `apps/web/src/app/api/v1/auth/`; `apps/web/src/app/api/v1/invitations/`; `apps/web/src/proxy.ts` | T-AUTH-2, 3, 4, 6 |
| M5-W1 | Worker | 1 | M5-L1 | Shell composites §16: AppShell, AppSidebar, AppHeader, BrandLogo, CommandMenu, NotificationBell, keyboard shortcuts | `packages/ui/src/composites/AppShell/`; `packages/ui/src/composites/AppSidebar/`; `packages/ui/src/composites/AppHeader/`; `packages/ui/src/composites/BrandLogo/`; `packages/ui/src/composites/CommandMenu/`; `packages/ui/src/composites/NotificationBell/`; `apps/web/src/i18n/messages/en/shell.json` | nav filtering unit tests pass |
| M5-W2 | Worker | 1 | M5-L1 | Data composites §15.4: DataTable, FilterBar, ViewSwitcher, SavedViewMenu, BulkActionBar, PageHeader, EmptyState, ErrorState, TableSkeleton | `packages/ui/src/composites/DataTable/`; `packages/ui/src/composites/FilterBar/`; `packages/ui/src/composites/ViewSwitcher/`; `packages/ui/src/composites/SavedViewMenu/`; `packages/ui/src/composites/BulkActionBar/`; `packages/ui/src/composites/PageHeader/`; `packages/ui/src/composites/EmptyState/`; `packages/ui/src/composites/ErrorState/`; `packages/ui/src/composites/TableSkeleton/`; `apps/web/src/i18n/messages/en/common.json` | logic unit tests in `src/lib` pass |
| M5-W3 | Worker | 1 | M5-L1 | Record composites §15.4: RecordPageLayout, ActivityFeed, CommentComposer, AttachmentList, CustomFieldsForm, UserPicker, RecordPicker, DateField, MoneyField, StagePill, StageSelect, PriorityIcon, UserAvatar, AvatarStack, MarkdownLite, ConfirmDialog | `packages/ui/src/composites/RecordPageLayout/`; `packages/ui/src/composites/ActivityFeed/`; `packages/ui/src/composites/CommentComposer/`; `packages/ui/src/composites/AttachmentList/`; `packages/ui/src/composites/CustomFieldsForm/`; `packages/ui/src/composites/Pickers/`; `packages/ui/src/composites/Fields/`; `packages/ui/src/composites/Stage/`; `packages/ui/src/composites/Avatars/`; `packages/ui/src/composites/MarkdownLite/`; `packages/ui/src/composites/ConfirmDialog/`; `apps/web/src/i18n/messages/en/record.json` | MarkdownLite escaping tests pass |
| M5-W4 | Worker | 1 | M5-L1 | Work composites: KanbanBoard with touch fallback (D-43), CalendarMonth, TaskSheet | `packages/ui/src/composites/KanbanBoard/`; `packages/ui/src/composites/CalendarMonth/`; `packages/ui/src/composites/TaskSheet/`; `apps/web/src/i18n/messages/en/work-ui.json` | board ordering/column logic unit tests pass |
| M5-W5 | Worker | 1 | M5-L1 | UI routes §12: file upload/download, brand logo and favicon, unread count, search §12.2 | `apps/web/src/app/api/v1/files/`; `apps/web/src/app/api/v1/brand/`; `apps/web/src/app/api/v1/notifications/`; `apps/web/src/app/api/v1/search/`; `apps/web/tests/integration/api/` | out-of-scope download returns 403; search respects scope |
| M5-W6 | Worker | 2 | M5-L2, M5-W1, M5-W2, M5-W3 | Auth pages and onboarding §17.1, §17.2 | `apps/web/src/app/(auth)/`; `apps/web/src/app/(app)/onboarding/`; `apps/web/src/server/actions/onboarding/`; `apps/web/src/i18n/messages/en/auth.json`; `apps/web/src/i18n/messages/en/onboarding.json` | pages render all §17.1 states on `pnpm dev` |
| M5-W7 | Worker | 2 | M5-W1, M5-W2, M5-W3, M5-W4 | Dashboard, My tasks, tasks list/record, calendar §17.3, §17.4, §17.5 (tasks), §17.7, §17.8 | `apps/web/src/app/(app)/page.tsx`; `apps/web/src/app/(app)/my-tasks/`; `apps/web/src/app/(app)/tasks/`; `apps/web/src/app/(app)/calendar/`; `apps/web/src/server/actions/work/tasks/`; `apps/web/src/server/queries/work/tasks/`; `apps/web/src/server/queries/dashboard/`; `apps/web/src/i18n/messages/en/tasks.json`; `apps/web/src/i18n/messages/en/dashboard.json` | pages render seeded data with loading/empty/error states |
| M5-W8 | Worker | 2 | M5-W1, M5-W2, M5-W3, M5-W4 | CRM pages leads, deals, organizations, contacts with ConvertLeadDialog §17.5, §17.6 | `apps/web/src/app/(app)/leads/`; `apps/web/src/app/(app)/deals/`; `apps/web/src/app/(app)/organizations/`; `apps/web/src/app/(app)/contacts/`; `apps/web/src/server/actions/crm/`; `apps/web/src/server/queries/crm/`; `apps/web/src/i18n/messages/en/crm.json` | pages render seeded data; conversion works end to end on `pnpm dev` |
| M5-W9 | Worker | 2 | M5-W1, M5-W2, M5-W3, M5-W4 | Project pages §17.5, §17.6 (project tabs) | `apps/web/src/app/(app)/projects/`; `apps/web/src/server/actions/work/projects/`; `apps/web/src/server/queries/work/projects/`; `apps/web/src/i18n/messages/en/projects.json` | project tabs render seeded data |
| M5-W10 | Worker | 2 | M5-W1, M5-W2, M5-W3 | Settings pages §17.12: general, branding, modules, terminology, members, groups, workflows, fields, views, notifications, profile, import | `apps/web/src/app/(app)/settings/layout.tsx`; `apps/web/src/app/(app)/settings/general/`; `apps/web/src/app/(app)/settings/branding/`; `apps/web/src/app/(app)/settings/modules/`; `apps/web/src/app/(app)/settings/terminology/`; `apps/web/src/app/(app)/settings/members/`; `apps/web/src/app/(app)/settings/groups/`; `apps/web/src/app/(app)/settings/workflows/`; `apps/web/src/app/(app)/settings/fields/`; `apps/web/src/app/(app)/settings/views/`; `apps/web/src/app/(app)/settings/notifications/`; `apps/web/src/app/(app)/settings/profile/`; `apps/web/src/app/(app)/settings/import/`; `apps/web/src/server/actions/settings/`; `apps/web/src/i18n/messages/en/settings.json` | each page enforces its §17.12 "Who" column server-side |
| M5-L3 | Lead | 3 | M5-W5, M5-W6, M5-W7, M5-W8, M5-W9, M5-W10 | Integrate pages into the shell, reconcile duplicates, locale completeness, barrels, `pnpm verify` | `apps/web/src/app/(app)/layout.tsx`; `packages/ui/src/index.ts`; `packages/ui/README.md`; `docs/decisions/` | `pnpm verify` green |
| M5-W11 | Worker | 4 | M5-L3 | E2E T-E2E-1..7, `@axe-core/playwright` checks per page, 390 px screenshots of shell, list, record, sheet | `tests/e2e/app/`; `tests/e2e/a11y/`; `tests/e2e/screenshots/` | `pnpm test:e2e` passes; no serious or critical axe violations |
| M5-L4 | Lead | 5 | M5-W11 | Acceptance review, report, retro | `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M5 row |

#### M6 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M6-L1 | Lead | 0 | — | Intake and mail contracts (ports, events, schemas), RecordAddressing interface, job registry interface | `packages/modules/intake/src/ports/`; `packages/modules/intake/src/events/`; `packages/modules/intake/src/schema/`; `packages/modules/mail/src/ports/`; `packages/modules/mail/src/events/`; `packages/modules/mail/src/schema/`; `packages/adapters/cloudflare/src/contracts/`; `docs/orchestration/m6/` | `pnpm typecheck` |
| M6-L2 | Lead | 1 | M6-L1 | Intake security gate (origin allowlist, server keys, Turnstile siteverify, `ratelimits` adapter) and public intake route with CORS | `packages/adapters/cloudflare/src/intake-guard/`; `packages/adapters/cloudflare/src/ratelimit/`; `apps/web/src/app/api/v1/intake/` | T-INTAKE-1, 2, 6, 8 |
| M6-L3 | Lead | 1 | M6-L1 | RecordAddressing HMAC, inbound acceptance rule, `apps/mail-router` Worker | `packages/modules/mail/src/addressing/`; `apps/mail-router/` | T-MAIL-3, 4, 5, 8 |
| M6-W1 | Worker | 1 | M6-L1 | Intake domain: forms, submissions, dedupe, field map, lead creation, notifications (§10.3 minus the security gate) | `packages/modules/intake/src/domain/`; `packages/modules/intake/src/commands/`; `packages/modules/intake/src/queries/`; `packages/modules/intake/test/` | T-INTAKE-3, 4, 5, 7, 9 |
| M6-W2 | Worker | 1 | M6-L1 | Email templates §14.1 in en with snapshot tests | `packages/modules/mail/src/templates/`; `packages/modules/mail/test/templates/` | T-MAIL-1, 9 |
| M6-W3 | Worker | 1 | M6-L1 | Mail domain: system email, inbound receive, quarantine, release, attachments (§10.4 minus addressing) | `packages/modules/mail/src/domain/`; `packages/modules/mail/src/commands/`; `packages/modules/mail/test/commands/` | T-MAIL-6, 7 |
| M6-W4 | Worker | 1 | M6-L1 | Cloudflare mail adapters: CloudflareMailSender error mapping, ResendMailSender (fetch), ConsoleMailSender, `payloadEmailAdapter`, `bridgeInboundEmail`, internal inbound route | `packages/adapters/cloudflare/src/mail/`; `packages/adapters/cloudflare/src/inbound/`; `packages/adapters/cloudflare/test/mail/`; `apps/web/src/app/api/v1/internal/email/` | T-MAIL-2 |
| M6-W5 | Worker | 1 | M6-L1 | Jobs §13: dispatcher windows, `jobRuns`, the six jobs | `packages/adapters/cloudflare/src/cron/`; `packages/adapters/cloudflare/test/cron/`; `apps/web/src/app/api/v1/internal/cron/`; `packages/platform/src/jobs/`; `packages/modules/work/src/jobs/`; `packages/modules/crm/src/jobs/` | T-JOBS-1..3 |
| M6-W6 | Worker | 2 | M6-L2, M6-L3, M6-W1, M6-W3 | Settings pages intake and email §17.12, onboarding intake step | `apps/web/src/app/(app)/settings/intake/`; `apps/web/src/app/(app)/settings/email/`; `apps/web/src/app/(app)/onboarding/steps/intake/`; `apps/web/src/server/actions/intake/`; `apps/web/src/server/actions/mail/`; `apps/web/src/i18n/messages/en/intake.json`; `apps/web/src/i18n/messages/en/email.json` | pages enforce owner/manager access server-side |
| M6-L4 | Lead | 3 | M6-W2, M6-W4, M6-W5, M6-W6 | Integrate, migration, deploy staging, real outbound and inbound round trip, deploy `ops-mail-router` | `apps/web/src/migrations/`; `apps/web/src/payload.config.ts`; `apps/web/src/payload-types.ts`; `packages/modules/intake/src/index.ts`; `packages/modules/intake/README.md`; `packages/modules/mail/src/index.ts`; `packages/modules/mail/README.md`; `packages/adapters/cloudflare/src/index.ts`; `packages/adapters/cloudflare/README.md`; `docs/decisions/` | round-trip evidence recorded |
| M6-W7 | Worker | 4 | M6-L4 | Cross-module tests on the integrated build (T-INTAKE, T-MAIL, T-JOBS end to end) and T-E2E-8 | `tests/integration/intake-mail/`; `tests/e2e/intake/` | `pnpm test` and `pnpm test:e2e --grep intake` pass |
| M6-L5 | Lead | 5 | M6-W7 | Acceptance, report, retro | `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M6 row |

#### M7 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M7-L1 | Lead | 0 | — | Tenant zod schema and final `gen-wrangler.ts` (isolation, rate-limit namespaces, mail-router bindings) | `scripts/gen-wrangler.ts`; `scripts/lib/tenant-schema.ts`; `tenants/`; `docs/orchestration/m7/` | generated configs contain only each tenant's own bindings |
| M7-W1 | Worker | 1 | M7-L1 | `provision-tenant.ts` steps §19.3 with idempotency checks and a `--dry-run` mode; `smoke-tenant.ts` | `scripts/provision-tenant.ts`; `scripts/smoke-tenant.ts`; `scripts/lib/provision/`; `scripts/test/provision/` | dry-run prints every step; re-running skips completed steps |
| M7-W2 | Worker | 1 | M7-L1 | `deploy-tenants.ts`: restore point, migrate, deploy, smoke, stop on failure, rollback | `scripts/deploy-tenants.ts`; `scripts/lib/deploy/`; `scripts/test/deploy/` | injected smoke failure stops the loop and triggers rollback in tests |
| M7-W3 | Worker | 1 | M7-L1 | Runbooks provision-tenant, deploy, rollback, incident, onboarding-customer (§19, §20) | `docs/runbooks/` | `pnpm check:docs` passes |
| M7-L2 | Lead | 2 | M7-W1, M7-W2, M7-W3 | `deploy.yml`; provision `staging-a` from scratch; injected failure drill; rollback drill; report, retro | `.github/workflows/deploy.yml`; `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M7 row |

#### M8 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M8-L1 | Lead | 0 | — | Verify §20.1 platform and §20.2 customer prerequisites, create `tenants/mirchmedia.jsonc` (platform-hosted), provision, redeploy `ops-mail-router`, smoke | `tenants/mirchmedia.jsonc`; `docs/orchestration/m8/` | `pnpm tenant:smoke mirchmedia` passes |
| M8-W1 | Worker | 1 | M8-L1 | Laravel forwarder for `POST /api/leads` (§20.8) on a branch of the `mirchmedia-laravel` repository, with a feature test against a mocked intake endpoint | `external:mirchmedia-laravel/routes/web.php`; `external:mirchmedia-laravel/routes/api.php`; `external:mirchmedia-laravel/tests/Feature/LeadForwardTest.php` | Laravel feature test passes |
| M8-W2 | Worker | 1 | M8-L1 | Transform the first customer's CSV exports into the `/settings/import` templates with a validation report, in a private workspace that is never committed | `external:onboarding-workspace/mirchmedia/` | row counts match the source; validation errors listed or zero |
| M8-L2 | Lead | 2 | M8-W1, M8-W2 | Deploy the forwarder, run imports in `/admin`, test a lead from each site, go-live report, retro | `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M8 row |

#### M9 work packages
| WP | Owner | Wave | Depends | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|
| M9-L1 | Lead | 0 | — | Triage the pilot friction list into fix WPs `M9-W1a`, `M9-W1b`, … (fixes only, no new features) with disjoint scopes, recorded in the M9 plan | `docs/orchestration/m9/` | every fix WP has all §0.5 fields and passes `check-orchestration` rules |
| M9-W1 | Worker | 1 | M9-L1 | Execute the fix WPs `M9-W1a…` exactly as written in `docs/orchestration/m9/plan.md`, one worker per fix WP | `(per fix WP in docs/orchestration/m9/plan.md)` | each fix WP's acceptance commands |
| M9-L2 | Lead | 2 | M9-W1 | Verify §20.5 criteria, final report, retro | `docs/reports/`; `harness/lessons/`; `harness/evals/` | §21.2 M9 row |

### 21.4 Open design items (resolved by the named WP, recorded in the decision register)
| Item | Resolved in | Question |
|---|---|---|
| Job pagination | M6-L1 | Cursor per job stored in `jobRuns` (last processed `(updatedAt, id)`), ordering, and resume after partial runs so batches of 200 never skip or repeat records |
| Mail-router secret handling | M6-L3 | Per-tenant internal secrets held by the router versus per-tenant signed forwarding, limiting what a compromised router exposes |
| Durable event outbox | not planned | Revisit only if production shows dropped side effects (D-47) |

---

## 22. Test catalog
**T-PLAT** 1 `changeStage` same stage → no writes · 2 CONFLICT on stale `updatedAt` · 3 duration computed · 4 terminal category sets/clears `closedAt` via module hook · 5 workflow invariants · 6 `validateCustomData` rejects unknown/invalid · 7 `notify` dedupe · 8 full permission matrix · 9 staff scope includes transitive reports (depth 5) and excludes peers · 10 inactive actor forbidden · 11 `applyTemplate` idempotent · 12 `brandTokens` contrast ≥ 4.5 · 13 `rankBetween` ordering + `rebalance` property · 14 sensitive field hidden from staff.
**T-CRM** 1 convert creates/links org, contact, deal and marks lead · 2 second convert → ALREADY_DONE · 3 contact dedupe by email · 4 custom-field intersection copy · 5 lost requires reason · 6 staff cannot convert out-of-scope lead · 7 injected failure after deal creation leaves no partial state, or retry completes idempotently.
**T-WORK** 1 My tasks buckets across timezone and DST boundaries · 2 subtask depth limit · 3 parent completion blocked by open children · 4 rank move within/between columns and rebalance · 5 `completedAt` set/cleared.
**T-AUTH** 1 inactive user login denied (`beforeLogin`) · 2 lockout after 5 attempts · 3 password policy on reset, accept, change · 4 blocked Payload auth routes return 404 · 5 last active owner cannot be demoted · 6 expired/revoked invitation rejected.
**T-INTAKE** 1 disallowed origin → 403 · 2 Turnstile failure → 403 · 3 missing email and phone → 400 · 4 duplicate same day → `duplicate`, no second lead · 5 field map to custom field · 6 rate limit → 429 · 7 email alias creates lead · 8 server key skips origin/Turnstile · 9 payload values absent from logs.
**T-MAIL** 1 template html+text snapshots per locale · 2 unverified sender falls back to platform sender · 3 inbound token routes to record · 4 unknown sender quarantined · 5 forged token rejected · 6 attachment size cap · 7 duplicate `messageId` ignored · 8 mail-router rejects unknown slug and forwards known slug · 9 sensitive template bodies contain no field values.
**T-JOBS** 1 each job run twice in one window → single effect · 2 batch of 200 continues next run · 3 overdue fires only after 09:00 tenant time.
**T-E2E** 1 owner invitation → set password → onboarding complete · 2 org/contact/lead → convert → deal dragged to Won · 3 project → task → assign staff → staff completes it in My tasks · 4 comment @mention → bell → navigate · 5 attachment upload/download; staff out of scope gets 403 · 6 staff opening another team's lead sees no-access state · 7 manager cannot open `/settings/branding` · 8 intake submission appears in leads with notification.
**T-DEPLOY** 1 `check:brand` on build output · 2 isolation §19.5 · 3 health reports version + migration · 4 cron fires (Workers logs) · 5 email arrives · 6 R2 round-trip.

---

## 23. Definition of Done (every feature)
Schema and domain model · commands/queries with `Result` errors · server authorization with scope tests · UI loading/empty/error/no-access states · activity/audit decision documented ·
i18n keys in every enabled locale (Phase 1: en) · terminology respected · white-label tokens respected · mobile layout checked · tests (unit/integration/E2E as applicable) · §6 gates green · §7 docs updated (README public API; ADR when a decision is made) ·
no brand or vertical strings in core · milestone report entry.
**Sensitive templates (`legal`, `health`):** sensitive fields manager_up only; attachment downloads logged; no field values in logs or emails; retention ADR before the first sensitive tenant goes live.

## 24. Observability & security baseline
Logs: JSON `{ level, msg, tenant, requestId, route, actorId?, durationMs, error? }` through the `Logger` port with `redact()`; never log passwords, tokens, cookies, intake payloads or email bodies.
Workers observability on; `/api/v1/health` returns version and migration. Track request/error rate, p95, D1 rows, job results, email failures, intake rejections.
Security: CORS only on intake for allowlisted origins; Payload CSRF origins = tenant host; cookies per D-38; lockout per D-38; password policy D-46;
rate limits via `ratelimits` bindings on `/api/v1/auth/*`, `/api/v1/intake/*`, `/api/v1/invitations/accept` (Payload lockout protects `/api/users/login` used by the admin; zone WAF rules optional for custom-domain zones);
Turnstile on web intake; upload mime/size allowlist; per-object authorization on downloads; GraphQL off; depth caps; security headers ported from `hyperzod-main-website/payload-cms/src/proxy.ts`;
least-privilege API tokens; secrets only in Wrangler and GitHub secrets.

## 25. Existing material (internal code; verify APIs before reuse)
- `hyperzod/hyperzod-main-website/payload-cms/src/payload.config.ts` (D1/R2 adapters, platform proxy for CLI, CORS/CSRF, JSON logger, depth caps), `src/proxy.ts`, `docs/security.md`, `src/collections/Users.ts`, `package.json` deploy scripts.
- `mirchmedia-projects/fasttrack/apps/platform-web` (Vitest/Playwright/ESLint patterns).
- Lead flows to migrate: `mirchmedia-laravel/routes/web.php` + `routes/api.php` (`/api/leads`), `web-*-vue` forms posting to it, `etcpa-laravel` and `homestar-lara` contact controllers, `lmpm/lib/google-sheets.ts`, `lmpm/app/api/partnership-lead/route.ts`.
- Behavior references (study only, no code): Frappe CRM sparse clone in the session scratchpad `frappe-crm/` (commit 2f6435d); Twenty, Plane, Huly, Corteza repositories (links in §27).


---

## 26. Self-improving execution harness
The harness is the build's control plane. It heals the development process, not the application: every failure becomes a durable safeguard that future work packages inherit.
Loop: **failure → classification → lesson → countermeasure → regression eval (reproduction + fix) → brief injection**. It is files, JSON schemas, Git diffs and shell commands, so any capable agent runtime can operate it.

### 26.1 Core (built in M0) and optional sophistication (deferred)
**Core:** planning (`harness:plan`), brief generation (`harness:brief`), scope enforcement (`check:scope`), structured reports, automatic metrics (`harness:record`), failure classification, lessons with brief injection, regression evals (`harness:evals`), retro with promotion and retirement (`harness:retro`), harness self-test.
**Optional sophistication (deferred):** dashboards, elaborate scoring, runtime-specific adapters, comparisons between agent types, automatic prompt optimization.

### 26.2 Layout
```text
harness/
  config.yaml                         concurrency cap, retry budget, promotion thresholds, severe classes, retirement window
  schemas/                            JSON schemas: attempt, report front matter, lesson, eval manifest
  templates/brief.md  report.md  spike-report.md
  metrics/attempts/<WP-ID>-a<k>.json  one file per attempt (no shared appends → merge-safe under parallel work)
  lessons/<lesson-id>.md              one file per lesson
  evals/<lesson-id>/repro/            reproduction: must FAIL the countermeasure (or reproduce the bug)
  evals/<lesson-id>/fixed/            corrected behavior: must PASS
  evals/<lesson-id>/eval.json         commands and expected exit codes for repro and fixed
  CHANGELOG.md                        harness changes with lesson ids
```
Lesson ids are collision-free without coordination: `L-<YYYYMMDD>-<WP-ID>-<first 6 hex of sha256(title)>`.

### 26.3 Automatic metrics
`pnpm harness:record <WP-ID> --attempt <k>` runs the WP's acceptance commands, `pnpm verify:fast` and `pnpm check:scope`, and writes `harness/metrics/attempts/<WP-ID>-a<k>.json`
(validated by `schemas/attempt.schema.json`): `{ wp, milestone, attempt, runner: "worker"|"lead", startedAt, finishedAt, gates: [{ name, exitCode, durationMs, failingLines }], scopeViolations: [paths], filesChanged, suggestedClasses: [], confirmedClasses: [], leadTookOver }`.
Workers run it before reporting; the lead re-runs it during review (the lead's file wins). `suggestedClasses` are filled automatically from a gate→class map in `config.yaml` (e.g. `check:scope` → `SCOPE_VIOLATION`, `check:brand` → `BRAND_OR_VOCAB_LEAK`, permission test failure → `AUTHZ_GAP`); the lead confirms or corrects `confirmedClasses`.
Review findings are metrics even when gates pass. Every `fix(...)` commit and every commit produced after the lead returns findings requires a new attempt file with confirmed root-cause classes. Attempt files and remediation commits remain append-only through the retro. First pass means attempt 1 passed and the lead returned no findings; any retry or review remediation makes first pass false.

### 26.4 Failure classes
Severe: `AUTHZ_GAP` · `TENANT_ISOLATION` · `SECRET_EXPOSURE` · `DATA_LOSS` · `DESTRUCTIVE_DEPLOY`.
Ordinary: `SCOPE_VIOLATION` · `SPEC_GAP` · `SPEC_MISREAD` · `CONTRACT_DRIFT` · `MISSING_TEST` · `FLAKY_TEST` · `IDEMPOTENCY_GAP` · `CONCURRENCY_GAP` · `DUPLICATE_ABSTRACTION` · `BRAND_OR_VOCAB_LEAK` · `GATE_FAILURE` · `DEPENDENCY_REQUEST` · `ENV_OR_CREDENTIALS` · `PLATFORM_LIMIT` · `DOC_GAP` · `OTHER`.
New classes are added by the lead with a changelog entry.

### 26.5 Promotion
- Severe classes promote on first occurrence, before the next WP that touches the affected paths is dispatched.
- Ordinary classes promote at 2 confirmed occurrences in a milestone or 3 cumulative.
- Each promotion creates one lesson with: symptom, cause, affected paths (globs), countermeasure type (`check` | `test` | `brief-clause` | `checklist` | `spec-adr`), countermeasure location, and an eval.
- Countermeasure preference: automated check or test wired into `verify:fast` or `verify` → brief clause → checklist item → spec change via ADR.
- Every lesson's eval has both `repro/` (the original failure is caught or reproduced) and `fixed/` (the corrected behavior passes). Detecting the old failure alone is insufficient.

### 26.6 Brief injection
`pnpm harness:brief <WP-ID>` adds every active lesson whose affected paths overlap the WP write scope under **Known pitfalls**, with its countermeasure and eval id.
For retries, the lead writes every review finding into **Previous attempt findings** before dispatch. Each finding states the observed behavior, root-cause class, required countermeasure, and required evidence. A worker does not rely on chat history to recover these facts.

### 26.7 Retirement and simplification
- **Retirement** is evidence-based: a lesson or check that has not fired for 3 milestones, whose `fixed/` eval passes and whose risk is covered by a stronger check, may be retired or merged by the lead with a changelog entry citing the metrics.
- Severe-class lessons retire only via ADR.
- The retro reports harness cost (total gate duration per WP) so slow or redundant checks are simplified.

### 26.8 Retro
`pnpm harness:retro m<N>` at milestone end: aggregates attempt files, review findings and remediation commits; lists classes over threshold, severe occurrences, first-pass rate, retries, lead takeovers and gate durations. A green first attempt followed by a `fix(...)` commit is not first pass. The retro scaffolds lesson and eval folders; the lead completes them and commits the harness changes before the next milestone's wave 0.

### 26.9 Harness self-test (M0 acceptance)
A planted end-to-end failure proves the loop:
1. A fixture WP `M0-X1` writes outside its scope and ships a failing permission test.
2. `harness:record` classifies `SCOPE_VIOLATION` and `AUTHZ_GAP`.
3. `harness:retro` promotes `AUTHZ_GAP` immediately.
4. The generated eval's `repro/` fails and `fixed/` passes.
5. `harness:brief` for a second fixture WP touching the same paths includes the lesson.
Fixtures live under `harness/selftest/` and run in `pnpm harness:evals`.

### 26.10 Scripts (`scripts/harness/`, each ≤ 250 lines, unit-tested)
| Command | Behavior |
|---|---|
| `pnpm harness:plan m<N>` | Copies the §21.3 table for M<N> into `docs/orchestration/m<N>/plan.md` with a status column; keeps existing status and recorded changes |
| `pnpm harness:brief <WP-ID>` | Renders `templates/brief.md` from the plan row, spec references, inputs and matching lessons |
| `pnpm check:scope <WP-ID>` | Diff vs write scope and §0.7 critical paths (critical → fail; other out-of-scope → flagged) |
| `pnpm harness:record <WP-ID> --attempt <k>` | Runs acceptance + `verify:fast` + scope check; writes the attempt file |
| `pnpm harness:retro m<N>` | Aggregates, promotes, scaffolds lessons and evals, reports cost |
| `pnpm harness:evals` | Runs every active eval (`repro` must fail, `fixed` must pass) and the self-test |

---

## 27. Reference library
**Cloudflare:** [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) · [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) · [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) · [D1 Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/) · [R2 Wrangler commands](https://developers.cloudflare.com/r2/reference/wrangler-commands/) · [Rollbacks](https://developers.cloudflare.com/workers/configuration/versions-and-deployments/rollbacks/) · [Workers Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/) · [Rate limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) · [Email Service Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/) · [Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/) · [Email Service limits](https://developers.cloudflare.com/email-service/platform/limits/) · [Email subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/) · [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/) · [Querying Workers metrics (GraphQL)](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/) · [Payload on Workers architecture](https://blog.cloudflare.com/payload-cms-workers/)
**OpenNext:** [Cloudflare adapter](https://opennext.js.org/cloudflare) · [Custom worker](https://opennext.js.org/cloudflare/howtos/custom-worker)
**Payload:** [Repository](https://github.com/payloadcms/payload) · [License](https://github.com/payloadcms/payload/blob/main/LICENSE.md) · [SQLite/D1 adapter](https://payloadcms.com/docs/database/sqlite) · [Storage adapters](https://payloadcms.com/docs/upload/storage-adapters) · [Authentication](https://payloadcms.com/docs/authentication/overview) · [Auth emails](https://payloadcms.com/docs/authentication/email) · [Collection hooks](https://payloadcms.com/docs/hooks/collections) · [Email](https://payloadcms.com/docs/email/overview) · [Jobs queue](https://payloadcms.com/docs/jobs-queue/queues) · [Import/export plugin](https://payloadcms.com/docs/plugins/import-export) · [Templates](https://github.com/payloadcms/payload/tree/main/templates)
**UI:** [shadcn/ui](https://ui.shadcn.com/docs) · [shadcn sidebar](https://ui.shadcn.com/docs/components/sidebar) · [shadcn data table](https://ui.shadcn.com/docs/components/data-table) · [Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) · [TanStack Table](https://tanstack.com/table/latest/docs/framework/react) · [Pragmatic drag and drop](https://github.com/atlassian/pragmatic-drag-and-drop) · [SVAR React Gantt](https://svar.dev/react/gantt/) · [Lucide icons](https://lucide.dev/icons/)
**Behavior references (study only, never copy):** [Frappe CRM](https://github.com/frappe/crm) · [Frappe license and trademark](https://docs.frappe.io/legal/others/license-and-trademark) · [Twenty](https://github.com/twentyhq/twenty) · [Plane](https://github.com/makeplane/plane) · [Huly](https://github.com/hcengineering/platform) · [Corteza](https://github.com/cortezaproject/corteza)

## Verification of this plan
The plan is satisfied when every acceptance row in §21.2 passes with evidence in `docs/reports/`. The M1 spike report is the first hard gate (GO / FALLBACK).
