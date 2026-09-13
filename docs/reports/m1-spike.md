# M1 spike report

Question: does Payload 3 + Next.js 16 via OpenNext on Cloudflare Workers (D1, R2) carry the product, or do we switch to the fallback stack (D-02)? Evidence files are in `docs/spike-data/`; the live plan is `docs/orchestration/m1/plan.md`.

## What was implemented

- Worker entry with OpenNext fetch, cron forwarding and inbound email forwarding; tenant files and generated Wrangler config for `staging-a` and `staging-b`.
- Payload on D1 with uuid ids and R2 storage: users, groups, organizations, projects, tasks, workflows, activity, attachments, notifications, email messages, job runs, settings; access per spec §11.1 with the §9.10 staff scope.
- Platform `can`, scope filter and `changeStage`; Payload repositories with compare-and-set writes; unit of work.
- Product UI: shadcn shell in the layout, tasks table, board (pragmatic drag and drop), timeline (SVAR Gantt MIT); all on Payload with the admin session.
- Internal cron route with the due-soon job, inbound email route storing `emailMessages`, Cloudflare and console mail senders, Payload email adapter.
- Local seed and reset, health route, measurement scripts.

## What worked

- One OpenNext build deployed to two tenant environments; secrets uploaded; the initial migration applied to both remote D1 databases through Payload with remote bindings (lead-only, E-006, E-016).
- Worker startup is far inside the 1 s limit.
- Tenant isolation (§19.5): data, bindings and sessions are separate per tenant.
- Server-side authorization through Payload access with `overrideAccess: false`; staff scope across relationships (`project.members`) compiles to Payload `where` clauses.
- Board drag, timeline drag and stale-version conflicts behave as specified in local end-to-end runs (M1-W4, M1-W5 reports).

## What failed

- D1 has no interactive transactions: the default D1 adapter never opens one, and forcing `transactionOptions` fails with "cannot begin transaction" (M1 plan notes). Mitigated by E-017.
- Payload update-by-where is not a single conditional statement: it finds ids and then writes by id, so a concurrent write in between can be lost (M1-W8).
- The first request after a deploy takes about one second while Payload and Next initialize (below).
- Signed-in pages and the login API hit "Worker exceeded CPU time limit" (error 1102) at 10 ms CPU, the Workers Free plan limit; the spec requires Workers Paid (§20.1). Page latency cannot be judged until the account plan is confirmed.
- Concurrent sign-in of the same user can fail with `UNIQUE constraint failed: users_sessions.id`: Payload rewrites session rows without a transaction (M1-W6).
- Deferred: the live email round trip, until Email Sending and Email Routing are onboarded for the approved domain (E-019); the email code is complete and tested.

## Tests performed

- Unit and adapter tests: 403 passing (platform policy, scope filter, `changeStage`, access functions, Where converter, unit of work, collections, repositories, mail senders, internal routes, cron and due-soon job, board and timeline logic, actions, gen-wrangler, seed data, measurement scripts).
- Local Playwright runs by M1-W4 and M1-W5: drag and menu moves persist across reload; timeline drag and resize persist; stale second tab gets CONFLICT and rolls back.
- M1-W6 integration tests on local D1 through Payload (`pnpm test:integration`, 17 cases, about 6 s): owner and manager see all 12 seeded tasks, 2 projects and 1 organization; staff1 sees 7 tasks and 1 project, staff2 5 tasks and none; reports two levels deep extend scope; stale `expectedUpdatedAt` returns CONFLICT with no writes; a repeated or concurrent cron run creates one notification; a repeated or concurrent inbound message stores one row. One case, two concurrent writes with the same version, fails as a known gap (M1-W10).
- M1-W6 Playwright spike smoke against the local app: sign in, tasks table, board drag, timeline drag, cron route with right and wrong secret (7 passed, 1 skipped on the phone profile).
- Deployed checks: health 200 on both tenants; isolation proof; unauthenticated board request.

## Runtime measurements

| Measure                             | staging-a                                       | staging-b                   | Source                          |
| ----------------------------------- | ----------------------------------------------- | --------------------------- | ------------------------------- |
| Upload size                         | 19,294 KiB, gzip 4,439 KiB                      | same build                  | deploy output                   |
| Worker startup (deploy)             | 48 ms                                           | 33 ms                       | deploy output                   |
| Worker startup, 5 uploads           | min 26, median 27, max 36 ms                    | —                           | `startup-staging-a-*.json`      |
| First request after deploy          | min 1,052, median 1,078, max 2,482 ms           | —                           | `startup-staging-a-*.json`      |
| Warm `/api/v1/health`, 200 requests | p50 322 ms, p95 350 ms                          | p50 266 ms, p95 287 ms      | `latency-*.json`                |
| CPU time per request                | p50 4.6 ms, p99 47 ms                           | p50 4.2 ms, p99 39 ms       | `analytics-*.json` (µs in file) |
| D1 per health request               | about 1.9 read queries, 3.1 rows read           | about 1.6 queries, 2.4 rows | `analytics-*.json`              |
| R2 operations                       | 0 (no uploads exercised)                        | 0                           | `analytics-*.json`              |
| Warm signed-in pages on Cloudflare  | not measured: 10 ms Free-plan CPU limit (E-018) | —                           | `wrangler tail`                 |

Latency was measured from a client in India against D1 databases that Cloudflare placed in APAC at creation. Tenants serving North America need a D1 location hint at creation (§19.3 provisioning).

Local load test on `pnpm preview` (workerd with local D1, 12 seeded tasks, 200 requests per level, 0 errors; `load-local-preview-*.json`):

| Route                      | c=1 req/s, p50 | c=10 req/s, p50 | c=50 req/s, p50, p95 |
| -------------------------- | -------------- | --------------- | -------------------- |
| `/api/v1/health`           | 297, 3.4 ms    | 527, 19 ms      | 554, 86 ms, 109 ms   |
| `/tasks` (signed in)       | 84, 11 ms      | 114, 87 ms      | 119, 416 ms, 526 ms  |
| `/tasks/board` (signed in) | 99, 10 ms      | 131, 74 ms      | 133, 379 ms, 476 ms  |
| `/timeline` (signed in)    | 152, 6.5 ms    | 243, 42 ms      | 247, 203 ms, 255 ms  |

One isolate saturates near 120 signed-in page requests per second: about 10 ms CPU per page, single-threaded, so Workers scales by adding isolates rather than per-isolate concurrency.

## Database / migration findings

- `payload migrate:create` generates one migration for all spike collections; applied locally and remotely without edits (remote: 33 s and 19 s over the remote proxy).
- `idType: 'uuid'` works on real D1; ids are strings.
- Development schema push is disabled so committed migrations stay the only schema source (M1-W9 finding).
- D-36: ordered writes with compare-and-set on `updatedAt`, then activity (E-017, provisional); M3-L1 chooses a single conditional `UPDATE` through the database adapter or D1 batches.
- Cookie helper for product auth routes (§12) was not exercised; product login routes are M5.

## Security / permission findings

- Collection access applies the role policy and staff scope; system writes use the Local API with `overrideAccess: true` only in adapters.
- Internal cron and inbound routes check the internal secret in constant time before any database access.
- A session token from `staging-a` is not accepted by `staging-b` (per-tenant `PAYLOAD_SECRET`).
- Unauthenticated product pages redirect to `/admin/login` through a streamed meta refresh with status 200 and no data, because the layout streams first; an edge auth check should return 307 (M5).
- `/api/users/first-register` is open until the first user exists; provisioning must create the owner before a tenant is reachable (M5 proxy block, M7 provisioning).
- Server action files export only the action; command cores live in plain modules so they are not client-callable.

## Tenant-isolation findings

Evidence: `docs/spike-data/isolation-staging-*.json`. A probe task created in `staging-a` is returned by its API (1) and stored in its D1 (1 row); `staging-b` returns 0 and its D1 holds 0 rows. Each Worker binds only its own D1, R2 bucket, rate-limit namespaces and self service. App names read back per tenant.

## Known risks

- First-request latency after deploy or isolate eviction is about one second.
- Lost-update window in compare-and-set writes until M3-L1.
- Bundle size and cold start will grow with more collections and pages; `pnpm size` tracks it.
- D1 placement: location hints are required per tenant region.
- The spike tenants run in the first customer's Cloudflare account and must be deleted after this report (E-007).

## Changes made from the original plan and why

Recorded in `docs/orchestration/m1/plan.md` ("Changes from spec table"): repositories (M1-W8) and seed/health (M1-W9) split out of M1-L3; measurement scripts written early by a worker and run by the lead; development task port before Payload wiring; worker-callable command cores moved out of server action files; tenant bindings marked remote for lead-only runs (E-016).

## GO or FALLBACK

GO. Payload on Workers starts in about 30 ms, isolates tenants completely, runs the product pages at about 10 ms CPU each with no errors under local load, and every spike behavior worked through Payload on D1. The failures are bounded and have known fixes: the lost-update window (single conditional write, M1-W10), the session race (serialize or disable Payload sessions), the one-second first request after a deploy, and the Free-plan CPU limit (Workers Paid before any real tenant). None of them is a reason for the fallback stack.

## Recommended next action

1. Merge M1-W10 (single conditional compare-and-set write) and re-run `pnpm test:integration`.
2. Owner: enable Workers Paid, then re-measure signed-in pages on `staging-a` with `scripts/spike/latency.ts` and `analytics.ts`; onboard Email Sending and Routing for the approved domain and run the email round trip (E-019).
3. Delete the spike tenants (`ops-staging-a`, `ops-staging-b`, their D1 databases and R2 buckets) after owner approval (E-007, §0.3).
4. Re-plan M2–M9 from these findings (§0.10): D-36 conditional writes and session handling in M3; edge auth check and `first-register` block in M5; D1 location hints and owner-first provisioning in M7.
