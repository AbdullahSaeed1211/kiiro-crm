# Agency execution

The active scope is the daily-use release in the [agency UX plan](../plans/agency-ux-simplification.md#same-day-release-target), plus bounded client-entry improvements. The [daily-work checklist](agency-daily-work.md) owns acceptance requirements. This ledger records execution evidence and remaining scope.

## Baseline

The working branch is `main`, based on `fea0d86`. Existing uncommitted changes were planning documentation from the preceding conversation. No application changes were present at dispatch. Production health reported `v0.10.4` with migration `20261022_090000_attendance` on 2026-10-22.

Node 22.22.3 and pnpm 10.34.5 match the repository requirements. Frozen dependency installation passed. Wrangler authentication includes the Mirch account. Only the Mirch tenant manifest is present. Operator secrets remain outside the repository.

Interactive browser control is disabled in Work settings. Existing Playwright tests can run against the local app. Automated screenshots and workflow results are evidence of those checks; they do not constitute a manual production visual review.

## Package state

| Package | State                     | Owner and owned files                                                           | Evidence or next action                                                                                      |
| ------- | ------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| P00     | Locally accepted          | Lead: baseline and this ledger                                                  | Installation, tools, authentication and production health checked                                            |
| P01     | Deployed, partial         | Lead: existing date/scope contracts                                             | Distinct task-date windows; no schema expansion. Cross-workflow contracts remain planned                     |
| P02     | Deployed                  | Attendance worker: attendance presentation, hook and copy                       | Local desktop/phone journey accepted; authenticated live review remains pending                              |
| P03     | Deployed                  | Lead: attendance/content loaders, load-failure presentation and error copy      | Read failures distinguished from empty lists; personal attendance avoids directory fetch                     |
| P04     | Locally accepted, partial | Lead: read-only D1 aggregates                                                   | Stage/cadence totals explain overdue count; original source reconciliation remains unresolved                |
| P05     | Running, partial deployed | Today worker: page, Today components/copy and dashboard/follow-up queries       | Distinct due queues deployed; Mine/Team selection is the next slice                                          |
| P06     | Running                   | Calendar worker: calendar page/workspace, agenda presentation and calendar copy | Month/Agenda presentation over existing scoped records; preserve calendar actions                            |
| P07     | Deployed, partial         | Client worker: organization presentation and scoped next-task query             | More menu, optional columns and earliest permitted client/project task checked locally                       |
| P08     | Running, partial          | Content worker: content-calendar presentation and agency-work copy              | Specific item editing and draft/scheduled workbench over existing fields; no new publisher                   |
| P10     | Deployed, partial         | Navigation worker: app-navigation and shell copy                                | Work, Clients and Sales grouped; content discoverable. Team area and role-first-use expansion remain planned |
| P18     | Deployed, partial         | Lead: reviewed commits, push and release                                        | Release evidence below; authenticated production acceptance is pending                                       |

Remaining packages and unfinished portions of these packages remain planned. This release does not establish new monthly content automation, template features or complete acceptance of the whole program.

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
