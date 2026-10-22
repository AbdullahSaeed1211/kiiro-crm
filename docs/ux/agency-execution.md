# Agency execution

The active scope is the daily-use release in the [agency UX plan](../plans/agency-ux-simplification.md#same-day-release-target), plus bounded client-entry improvements. The [daily-work checklist](agency-daily-work.md) owns acceptance requirements. This ledger records execution evidence and remaining scope.

## Baseline

The working branch is `main`, based on `fea0d86`. Existing uncommitted changes were planning documentation from the preceding conversation. No application changes were present at dispatch. Production health reported `v0.10.4` with migration `20261022_090000_attendance` on 2026-10-22.

Node 22.22.3 and pnpm 10.34.5 match the repository requirements. Frozen dependency installation passed. Wrangler authentication includes the Mirch account. Only the Mirch tenant manifest is present. Operator secrets remain outside the repository.

Interactive browser control is disabled in Work settings. Existing Playwright tests can run against the local app. Automated screenshots and workflow results are evidence of those checks; they do not constitute a manual production visual review.

## Package state

| Package | State                     | Owner and owned files                                                                             | Evidence or next action                                                                                                                        |
| ------- | ------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| P00     | Locally accepted          | Lead: baseline and this ledger                                                                    | Installation, tools, authentication and production health checked                                                                              |
| P01     | Deployed, partial         | Lead: existing date/scope contracts                                                               | Distinct task-date windows; no schema expansion. Cross-workflow contracts remain planned                                                       |
| P02     | Deployed                  | Attendance worker: attendance presentation, hook and copy                                         | Local desktop/phone journey accepted; authenticated live review remains pending                                                                |
| P03     | Deployed                  | Lead: attendance/content loaders, load-failure presentation and error copy                        | Read failures distinguished from empty lists; personal attendance avoids directory fetch                                                       |
| P04     | Locally accepted, partial | Lead: read-only D1 aggregates                                                                     | Stage/cadence totals explain overdue count; original source reconciliation remains unresolved                                                  |
| P05     | Locally accepted, partial | Today worker: page, Today components/copy and dashboard/follow-up queries                         | Mine/Team selection and scoped drilldowns passed desktop/phone; owner actions remain available in Mine                                         |
| P06     | Locally accepted, partial | Calendar worker: calendar page/workspace, agenda presentation and calendar copy                   | Month/Agenda switch and task-panel return preserve personal scope; desktop/phone journeys passed                                               |
| P07     | Deployed, partial         | Client worker: organization presentation and scoped next-task query                               | More menu, optional columns and earliest permitted client/project task checked locally                                                         |
| P08     | Locally accepted, partial | Content worker: content-calendar presentation and agency-work copy                                | Explicit project capture, status tabs, versioned editing, discard warning and exact timestamp retention checked                                |
| P09     | Deployed, partial         | Monthly work-order worker: work-domain contracts, project adapter, monthly runner and project API | Opt-in monthly issue/delivery settings, unique occurrence identity and interrupted-notification recovery accepted locally; deployed as v0.10.7 |
| P10     | Deployed, partial         | Navigation worker: app-navigation and shell copy                                                  | Work, Clients and Sales grouped; content discoverable. Team area and role-first-use expansion remain planned                                   |
| P13     | Deployed, partial         | Reminder worker: schedule reminder source, due-soon job and notification presentation             | Upcoming callback/appointment reminders and actionable labels deployed as v0.10.7; broader snooze/approval policy remains planned              |
| P18     | Deployed, partial         | Lead: reviewed commits, push and release                                                          | Release evidence below; authenticated production acceptance is pending                                                                         |

Remaining packages and unfinished portions of these packages remain planned. This release does not establish new monthly content automation, template features or complete acceptance of the whole program.

The active monthly-work slice adds opt-in task generation and in-app sales-event reminders. It does not publish to GHL, infer client approval or implement notification snoozing. Existing projects remain disabled until an authorized manager selects designers and saves the schedule.

## Data provenance findings

Read-only D1 queries against `ops-mirchmedia` grouped non-deleted tasks by workflow category and repeat cadence. At the October 22 date boundary, open backlog contained 70 overdue weekly tasks and 77 overdue non-repeating tasks. Another 132 monthly backlog tasks were not overdue. No task had populated custom metadata in these groups.

The grouped query was:

```sql
SELECT s.category, t.repeat, count(*) AS items,
  sum(CASE WHEN t.due_at < 1792627200000 THEN 1 ELSE 0 END) AS overdue,
  sum(CASE WHEN t.custom_data IS NOT NULL AND t.custom_data != '{}' THEN 1 ELSE 0 END) AS with_metadata
FROM tasks t
LEFT JOIN workflows_stages s ON t.stage_id = s.id
WHERE t.deleted_at IS NULL
GROUP BY s.category, t.repeat;
```

This explains the visible overdue total by category and cadence. It does not establish which tasks were completed outside the CRM, nor authorize deletion, completion or date changes. Compare the task descriptions and original work orders before proposing reconciliation. Existing completed tasks remain excluded through terminal workflow categories.

## Acceptance and release

The existing core-layout Playwright check passed on desktop. The Settings interaction check initially expected advanced headings before opening the existing All settings disclosure. The check now opens that disclosure before asserting its contents. This does not change the Settings implementation.

Eight selected Playwright checks passed across desktop Chromium and a 390 px phone WebKit viewport. They cover Settings and command search, failed attendance submission with retained input, retry, check-in/out and audit expansion, staff task-panel navigation, member API denial and light-mode defaults. The existing core-layout check also passed on both viewport profiles. The final compact phone attendance layout passed on both profiles after screenshot review.

The staff check asserts the member API returns 403 and the member page exposes no Members heading. Next.js can stream a not-found page with HTTP 200, so page status alone does not establish access. The Settings check opens All settings on desktop and phone, matching the existing component instead of expecting a removed phone picker. Panel navigation retains the existing 12-second route budget for local compilation.

Unit checks and all 18 local database integration cases passed. Typecheck, lint, formatting, dependency boundaries, unused-code checks, duplication threshold, branding, vocabulary, documentation, tenant isolation, STE and i18n checks passed. The OpenNext production build and size check passed. Screenshots are generated under the ignored `test-results/` directory.

The deployment dry run targets only Mirch. GitHub repository and production-environment secret inventories contain no configured secrets, so the tag workflow cannot perform this deployment. The operator path uses existing local Wrangler authentication and the tenant's external secret file.

## Release evidence

| Field                           | Observed result                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Pushed application source       | `329c121d09bc446ef504ebaf7e25d962bf5ac4db` on `origin/main`                                                                      |
| Pushed release tag              | `v0.10.5`, pointing to that application source                                                                                   |
| Release command                 | `OPS_ALLOW_LIVE=1 pnpm tenants:deploy --tag v0.10.5 --execute`, with credentials from operator custody                           |
| Command result                  | Exit 0; health, login-page, authenticated R2 probe and email acceptance passed                                                   |
| Live health                     | `https://crm.mirchmedia.com/api/v1/health` returned version `v0.10.5` and migration `20261022_090000_attendance`                 |
| Active Worker version           | `5d14ca02-0e13-4f89-90c8-ce9fe17ac159`, 100% traffic, in the deployment listing                                                  |
| Previous Worker version         | `e005335e-af03-4b5a-83e4-a40b1fa814b2`; use the [rollback runbook](../runbooks/rollback.md) if required                          |
| D1 recovery reference           | Bookmark `00000f89-00000000-0000510c-3575b86f24cd2f283ec4f5b67f874489`, read after deployment; no data restore performed         |
| Public route behavior           | Login returned 200; attendance, organizations and content-calendar redirected unauthenticated requests to login                  |
| Authenticated production review | Pending. The previously supplied login returned 401. The account exists and is active; no password, identity or role was changed |

Full write journeys ran only against local fixture accounts. Production data was queried read-only for provenance and account existence. Successful deployment and local acceptance do not establish complete authenticated production UX acceptance.

## Scoped workbench acceptance

The Today, Agenda and content packages are frozen for integration. Eight selected Playwright journeys passed across desktop Chromium and phone WebKit: core layouts, scoped Agenda/task-panel return, Today Mine/Team drilldowns and content editing with discard protection. The content journey reloads the record and confirms its exact publication timestamp is unchanged after a title edit. New captures require an explicit project rather than silently selecting the first client project.

Recurring task successors preserve `ownerOnly`. A local API reproduction exposed the missing flag; the regression in `packages/modules/work/test/work.test.ts` and a repeated local API journey confirm the successor retains private visibility. This does not alter existing production records.

All 382 unit cases and 18 database integration cases passed. Formatting, typecheck, lint, dependency boundaries, unused-code, duplication threshold, brand, vocabulary, documentation, tenant isolation, STE and i18n checks passed. The additional formatter audit exposed seven pre-existing hardcoded display locales outside this package; the content editor uses the tenant formatter, and the calendar ISO-key formatter is explicitly classified as non-display. These remaining audit findings are not closed by this release.

These packages are deployed as `v0.10.6`. The earlier production authentication limitation still applies. The package rows above distinguish local UX acceptance from authenticated production acceptance.

| Field                   | Observed result                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Pushed source and tag   | `858f3843c6e56660ad3586d2ead167213f6710a4` on `origin/main`; pushed tag `v0.10.6` points to that source |
| Release command         | `OPS_ALLOW_LIVE=1 pnpm tenants:deploy --tag v0.10.6 --execute`, using existing operator credentials     |
| Build and deploy        | OpenNext production build and size check passed; deployment exited 0                                    |
| Smoke results           | Health 200, login 200, authenticated R2 put/get/delete passed, email accepted                           |
| Live health             | Version `v0.10.6`, migration `20261022_090000_attendance`                                               |
| Active Worker           | `6ebd211a-63ae-4d40-a7af-cd35b5c47c0f`, 100% traffic                                                    |
| Previous Worker         | `5d14ca02-0e13-4f89-90c8-ce9fe17ac159`; code-only recovery follows the rollback runbook above           |
| Post-deploy D1 bookmark | `00000f8c-00000000-0000510c-48a3ef4f68c422fc7c5021bce71e896e`; no reset or restore performed            |

## Monthly automation acceptance

The local API accepted an owner-configured schedule, rejected a stale version with 409 and an invalid day with 400, and denied a staff configuration write with 403. Two concurrent scheduler calls plus a later-window replay produced one independent task, due November 3 as UTC-midnight milliseconds, one assignment notification and one scheduled-callback reminder. These checks used local fixtures only.

The initial real-database replay produced duplicate tasks because Payload discarded the supplied UUID. The adapter uses a persisted `monthlyOccurrenceKey` instead. Migration `20261022_150000_monthly_work_orders` adds a nullable column and unique index without changing existing records. Local migration and all 18 database integration cases passed. The repository's agent guide records the requirement to verify occurrence identity against the real driver; the fake now assigns task IDs rather than trusting requested IDs.

The reminder source retains inaccessible rows with empty recipient lists so a bounded batch can advance beyond them. Schedule notices use independent continuation state, an exact event-time deduplication key and each active recipient's parent-record access. Monthly assignment recovery also checks current task visibility, and archived occurrences remain archived.

All 397 unit cases passed. Full formatting, TypeScript, lint, dependency-boundary and unused-code checks passed. Monthly setup passed on desktop Chromium and phone WebKit, including typed title, retained draft, designer selection, save, reload and stale-edit conflict. Notification/task-panel navigation passed on both profiles. The changed project surface has no horizontal overflow at 1440 px or 390 px. A staff project page rendered its read-only monthly summary, and the configuration API denied unauthenticated access. OpenNext production build and size checks passed. The earlier authenticated production review limitation remains open.

### Monthly automation release

The deployment command was interrupted before its final result was captured. On resumption, the Worker deployment listing and live health confirmed the new release. No second deployment was needed. The existing authenticated smoke command was run separately and exited 0.

| Field                             | Observed result                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pushed application source and tag | `992602f16bc6ada5dd4771292fe7aae1cd5cef96` on `origin/main`; pushed tag `v0.10.7` points to that source                                                             |
| Release command                   | `OPS_ALLOW_LIVE=1 pnpm tenants:deploy --tag v0.10.7 --execute`, using existing operator credentials                                                                 |
| Independent smoke command         | `OPS_ALLOW_LIVE=1 pnpm tenant:smoke mirchmedia --execute`; exit 0                                                                                                   |
| Smoke results                     | Health 200, login 200, authenticated R2 put/get/delete passed, email accepted                                                                                       |
| Live health                       | Version `v0.10.7`, migration `20261022_150000_monthly_work_orders`                                                                                                  |
| Active Worker                     | `a8bd1934-aaab-4948-b52d-0a1574d8babc`, 100% traffic                                                                                                                |
| Previous Worker                   | `6ebd211a-63ae-4d40-a7af-cd35b5c47c0f`; code-only recovery follows the rollback runbook above                                                                       |
| D1 recovery reference             | Post-migration bookmark `00000f97-00000008-0000510c-ec6e65acf37a3642ad5e8ea083306882`; no reset or restore performed                                                |
| Enablement                        | Existing projects remain opted out. A manager must open a project, set up Monthly design work, select designers and save. Default issue/delivery days are 23 and 3. |

Authenticated production workflow acceptance remains unverified. Local browser and real-driver checks, public live routes and internal infrastructure probes are separate evidence; none establishes a completed production user journey.

## Client delivery and interaction close-out

The client overview shows its earliest dated open task, the client owner, overdue open-task count and deliverables awaiting a client response. Counts use the authenticated request and visible project relationships. Empty values remain explicit; they do not imply that delivery is complete. Project links retain the route to the underlying work.

Deliverable creation retains its title, link and selected file when saving fails. Response controls retain the staff note on failure or conflict. Refresh status loads the latest version without discarding that draft; retry requires an explicit action. A local phone browser completed conflict, refresh, retained note and approval. The displayed recorder is the authenticated staff member, not a claim that the client authenticated or approved through a portal. The existing versioned command persists response actor and time.

The generic application loading boundary replaced Today briefly when opening an intercepted task panel. The pending overlay has its own loading boundary; the generic application fallback is removed. A browser regression observed the unwanted fallback before the repair and its absence afterward. The existing shift checks use a buffered `PerformanceObserver`; unsupported browsers are marked unmeasured rather than reported as zero. Geometry checks still run on those browsers.

Eight selected route-health journeys passed across desktop Chromium and 390 px phone WebKit. They cover contextual and canonical task detail, history, Escape, close controls, source focus, pending workspace preservation from Today and Tasks, and personal Agenda return. Client overviews rendered at 1440 px and 390 px without horizontal overflow or error boundaries. Full static checks, all 397 unit cases, all 18 database integration cases, the Next.js production build and size check passed before the final approval recovery refinement. Final typecheck, lint, dependency boundaries, unused-code and i18n checks passed after that refinement. Final artifact and deployment evidence remain pending.

Record tabs contain their loaded content already. Changing the tab updates the URL through the native history integration instead of requesting another server render. A local Chromium pass switched through all five project tabs in 61-178 ms per click with zero RSC requests. Reload restored the selected tab. This measurement covers loaded-tab switching, not the initial project read. The initial project page still loads the work read model and its supporting data.

### Role and recurrence observations

Local owner and manager accounts could read team calendars. Staff team-calendar requests, billing reads and member-list reads returned 403. Two staff accounts temporarily given the Sales profile could read their own fixture leads and appointments; cross-account lead and event reads and a cross-account lead edit returned 404. Delivery and Consultant profiles could not list or read an assigned sales lead; creation returned 403. Profiles were restored and read back after these checks.

A staff account completed an assigned weekly fixture task. The API returned the completed occurrence and one successor due seven days later. The Repeating view showed the successor and Weekly cadence before and after reload. Fixture leads and tasks were archived and appointments cancelled. No production role, attendance or work record was changed for acceptance.

An authenticated owner session on production rendered Today, the populated calendar, crowded-day disclosure and Repeating. Opening and closing a task returned to Today and restored trigger focus. These observations establish the inspected owner read paths only. Other production roles and production approval writes remain unverified. The earlier unavailable-login observation remains part of its historical release evidence.

### Client delivery release evidence

| Field                     | Observed result                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pushed application source | `1b41f473457e696cd67ce6ca99e71a4f03337fc8` on `origin/main`; release tag `v0.10.8` points to that source                                                                                                                                  |
| Release command           | `OPS_ALLOW_LIVE=1 pnpm tenants:deploy --tag v0.10.8 --execute`; exit 0                                                                                                                                                                    |
| Artifact                  | OpenNext build completed; size check passed                                                                                                                                                                                               |
| Live health               | Version `v0.10.8`, migration `20261022_150000_monthly_work_orders`; no new migration in this release                                                                                                                                      |
| Smoke results             | Health 200, login 200, authenticated R2 put/get/delete passed, email accepted                                                                                                                                                             |
| Active Worker             | `659ca700-a2f7-424e-8a1a-ef3760f4b4b3`, 100% traffic                                                                                                                                                                                      |
| Previous Worker           | `a8bd1934-aaab-4948-b52d-0a1574d8babc`; compatible code rollback retains data                                                                                                                                                             |
| Recovery reference        | Bookmark `00000f9c-00000024-0000510c-5c73fbeaea327f7567411bbe8a53cebe`, observed during deployment; no restore performed                                                                                                                  |
| Live UI limitation        | Browser access became disabled in Work settings before the post-deploy authenticated walkthrough. No alternate browser path was used to bypass the restriction. Local UI acceptance and live infrastructure probes are separate evidence. |

The client worker attempted the existing local demo seeder before creating its bounded verification fixture. That seed failed with a D1 emulator error and may have left partial local data. No database reset or cleanup purge was performed. Production data was unaffected. A streamed staff not-found page can return HTTP 200 while its protected content remains absent and its API returns 403; the older parity test's status-only assertion remains unresolved.
