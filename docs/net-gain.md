# Net gain of the shell, speed and design work

What changed on `feat/admiring-wozniak-tolx3r` since `4502fb4`, measured. Times come from the local dev sandbox, where one database statement costs about 40 ms; production on Cloudflare D1 will be lower per statement, so read the **statements** column as the reliable number and the **time** column as an estimate.

## Speed: database statements per page view

Seeded demo data (130 leads, 270 tasks, 104 contacts), signed in as the owner. Trace with `OPS_LOG_SQL=1` ([performance](performance.md)).

| Page                   |    Before |    After |          Saved |                Est. time saved at 40 ms |
| ---------------------- | --------: | -------: | -------------: | --------------------------------------: |
| Contacts               |        70 |        6 |             64 |          2.6 s (measured 2.3 s → 0.8 s) |
| Reports                |        60 |       17 |             43 |          1.7 s (measured 2.8 s → 1.4 s) |
| Today                  |        41 |       27 |             14 |                                   0.6 s |
| Leads                  |        16 |       10 |              6 |                                  0.24 s |
| Lead board             |        16 |       11 |              5 |                                   0.2 s |
| Tasks                  |        16 |       11 |              5 |                                   0.2 s |
| Deals                  |        18 |       13 |              5 |                                   0.2 s |
| Projects               |        16 |       12 |              4 |                                  0.16 s |
| Team assignments       |        16 |       12 |              4 |                                  0.16 s |
| Deal board             |        16 |       13 |              3 |                                  0.12 s |
| My tasks               |         9 |        6 |              3 |                                  0.12 s |
| Calendar               |        10 |        7 |              3 |                                  0.12 s |
| Task board             |        12 |       10 |              2 |                                  0.08 s |
| Organizations          |         8 |        6 |              2 |                                  0.08 s |
| Attendance             |         6 |        4 |              2 |                                  0.08 s |
| Sales, Inbox, Timeline | 13, 8, 10 | 12, 7, 9 |              3 |                                  0.12 s |
| Billing                |         4 |        4 |              0 |                                       0 |
| **All 19 pages**       |   **365** |  **197** | **168 (46 %)** | **about 6.7 s per round of every page** |

Also: `/api/v1/nav/counts` 195 → 150 ms; every full read of a small table is one statement instead of two (the cause of most of the saving above).

## Stability

| Measure                                             | Before                      | After                                                              |
| --------------------------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| Layout shift, phone timeline (4× CPU, slow network) | 0.200 (poor)                | 0.000                                                              |
| Layout shift, 38 other routes at 1440 and 390 px    | 0.000                       | 0.000                                                              |
| Automated guard against layout shift                | none                        | 18 browser checks (9 routes × 2 widths); fails on the old timeline |
| Sidebar links clipped at 900 px height              | 3 (Reports, Inbox, Billing) | 0                                                                  |

## DRY and simplicity

| Area                                                                    | Before                                                    | After                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Lists of destinations (sidebar, command menu, `g` keys, shortcuts help) | 4 hand-kept lists, 3 that ignored the viewer's role       | 1 model; a test fails on duplicate keys and hidden links                      |
| Command menu offering links the viewer cannot open                      | Leads, Deals for staff                                    | none                                                                          |
| View switcher placement                                                 | 11 pages each placed a boxed pill group in the action row | 1 `PageHeader` slot; 12 uses, one look, one row on a phone                    |
| Today's scope toggle                                                    | its own button-pair nav                                   | the same tab strip                                                            |
| Hard-coded English in page breadcrumbs                                  | 12 literals                                               | 0 (terminology, then locale copy)                                             |
| Sidebar footer                                                          | 3 stacked rows, a theme button in the header              | 1 account menu                                                                |
| Per-row reads on the contacts list                                      | 2 statements per organization                             | 1 statement per page                                                          |
| Task counts for reports                                                 | about 3 count queries per person                          | 1 query                                                                       |
| Deleted code                                                            | `restamp-deal-currency.ts` (a data-mutating shortcut)     | removed                                                                       |
| Duplicated code (jscpd)                                                 | 48 clones, 409 lines (0.44 %)                             | 48 clones, 409 lines (0.43 %): no new duplication despite 19 new files        |
| Unit tests                                                              | 432                                                       | 438                                                                           |
| Source lines (app and packages)                                         | 80,182                                                    | 80,672 (+490: nav model, account and New menus, counts endpoint, query trace) |

## Data safety fixed along the way

| Defect                  | Before                                              | After                                                                    |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------ |
| Changing the currency   | rewrote every saved deal's currency code            | existing deals keep theirs (UX 40)                                       |
| Replacing a logo        | could delete the previous file when the save failed | new file under its own key; old file removed only after the save (UX 41) |
| Blocked browser storage | theme provider threw                                | theme works for the visit (UX 44)                                        |

## Not measured

The 200 ms target on Cloudflare, production-build timings (the local build did not finish within the time allowed) and any user-facing time saved by the interface itself. They need a deployed tenant.

## Since the first version of this table

| Area                                             | Before                                                                             | After                                                                                                       |
| ------------------------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Making a task for a client or for someone        | no client or assignee on the New task page                                         | both, on the page; a Client field on the task panel; staff keep their own                                   |
| A client's money                                 | not on the client page                                                             | Billing tab and an Outstanding figure (owners and managers)                                                 |
| Settings pages reachable without a click         | 3 of 18                                                                            | 18 of 18 on desktop                                                                                         |
| Vertical-template vocabulary shown in the UI     | never (wrong keys)                                                                 | yes                                                                                                         |
| Report ranges that silently fell back            | all invalid ones                                                                   | none; the reason is shown                                                                                   |
| Stale end-to-end specs                           | 3                                                                                  | 0 (the emailed-quote spec needs a mail service)                                                             |
| Spanish on the screens staff and owners use most | English on record pages, deals, projects, bulk bars, time log and 9 settings pages | Spanish on all of them; 9 low-traffic admin pages (about 65 lines) left, measured in [UX 38](backlog/ux.md) |
| Hand-made tab strips                             | 4 (Billing, Activity, Today scope, task and deal views)                            | 0; every one uses the shared tab strip                                                                      |
| Client page statements                           | 28 (every tab built on every visit)                                                | 18 on the Overview, 6 or 7 on any other tab                                                                 |
| Contact and lead page statements                 | 22 and 31 (every tab built, lead loader run twice)                                 | 14 to 15 and 13                                                                                             |
