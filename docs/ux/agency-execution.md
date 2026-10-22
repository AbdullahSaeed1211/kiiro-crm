# Agency execution

The active scope is the daily-use release in the [agency UX plan](../plans/agency-ux-simplification.md#same-day-release-target), plus bounded client-entry improvements. The [daily-work checklist](agency-daily-work.md) owns acceptance requirements. This ledger records execution evidence and remaining scope.

## Baseline

The working branch is `main`, based on `fea0d86`. Existing uncommitted changes were planning documentation from the preceding conversation. No application changes were present at dispatch. Production health reported `v0.10.4` with migration `20261022_090000_attendance` on 2026-10-22.

Node 22.22.3 and pnpm 10.34.5 match the repository requirements. Frozen dependency installation passed. Wrangler authentication includes the Mirch account. Only the Mirch tenant manifest is present. Operator secrets remain outside the repository.

Interactive browser control is disabled in Work settings. Existing Playwright tests can run against the local app. Automated screenshots and workflow results are evidence of those checks; they do not constitute a manual production visual review.

## Package state

| Package | State            | Owner and owned files                                                                               | Evidence or next action                                                                                                                                 |
| ------- | ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P00     | Locally accepted | Lead: baseline and this ledger                                                                      | Installation, tools, authentication and production health checked; push/deployment identity pending                                                     |
| P01     | Review           | Lead: existing date/scope contracts; no schema expansion                                            | Due-today and later-this-week filters use distinct calendar-date windows; no new role or record model                                                   |
| P02     | Review           | Attendance worker: attendance presentation, hook and copy                                           | One primary action; optional exception fields; bounded history and expanded audit details. Targeted lint/type checks passed; integrated journey pending |
| P03     | Review           | Lead: attendance/content loaders, shared load-failure presentation and localized app error boundary | Read failures stay distinct from empty lists; personal attendance no longer fetches the full user directory                                             |
| P04     | Running          | Lead: read-only D1 aggregates                                                                       | Provenance findings below; no production records changed                                                                                                |
| P05     | Review, partial  | Lead: Today queues, dashboard queries, task due filters and copy                                    | Due today and later this week have matching drill-downs; historical reconciliation and direct mutation actions remain outside this slice                |
| P07     | Review, partial  | Client worker: organization list, overview, next-task read model and copy                           | More menu and hidden optional columns implemented; next-task scope correction under review                                                              |
| P10     | Review, partial  | Navigation worker: app-navigation and shell copy                                                    | Today first; Work, Clients and Sales grouped; content discoverable; role/module gates retained. No new Team route                                       |
| P18     | Planned          | Lead: reviewed commits, push and release                                                            | Required checks, local acceptance and release evidence pending                                                                                          |

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

Unit checks and all 18 local database integration cases passed. Typecheck, lint, formatting, dependency boundaries, unused-code checks, duplication threshold, branding, vocabulary, documentation, tenant isolation, STE and i18n checks passed. Production build and deployment remain pending. Screenshots are generated under the ignored `test-results/` directory.

The deployment dry run targets only Mirch. GitHub repository and production-environment secret inventories contain no configured secrets, so the tag workflow cannot perform this deployment. The operator path owns the release and uses existing local Wrangler authentication and the tenant's external secret file. The lead must record the pushed source, release tag, deployed version and live observations before moving any package to live-accepted.
