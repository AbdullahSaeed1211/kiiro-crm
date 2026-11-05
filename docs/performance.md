# Performance

How requests are kept lean, what has been changed, and where it stands. Each optimization below is its own commit, so any of them can be taken or left on its own with `git cherry-pick <hash>`. None depends on another.

## Rules

- **A page reads what it renders, in as few queries as it can.** The count of database statements is the budget; each costs a network round trip on D1.
- **Start independent reads together** (`Promise.all`), never one after another.
- **Never read per row.** A list loads related records with one `id in (…)` query.
- **No tenant data in browser storage, and no start-up calls.** The browser holds the session cookie and per-viewer preferences only ([architecture](architecture.md#conventions)). A "boot" endpoint cached in `localStorage` was considered and rejected: it would put tenant data where any script on the page can read it, outlive a role change or sign-out, and need its own invalidation. Caching belongs on the server, per request or for seconds.
- **A cache is allowed only for data that changes rarely and is not a permission decision.** Today there is one: closed workflow stages for sidebar counts, one minute, per Worker (one tenant each).
- **Nothing moves after paint.** A layout-shift observer guards it ([layout-shift spec](../tests/e2e/customer/layout-shift.spec.ts)).

## See every query

```bash
OPS_LOG_SQL=1 PORT=3001 pnpm dev
```

Every statement the database receives is printed as `SQL <text>`, in order, in the server log (`apps/web/src/server/sql-trace.ts`). Count a page's queries:

```bash
L=$(wc -l < dev.log); curl -s -o /dev/null -b /tmp/ops.jar localhost:3001/contacts; sleep 1; tail -n +$((L+1)) dev.log | grep -c '^SQL'
```

Repeated lines with different ids are an N+1. Request time in the dev sandbox is about 40 ms per statement, so statement count is the number to trust; absolute times on Cloudflare will be lower.

## Changes

| Commit          | Change                                                                                                                                                   | Before → after (dev sandbox)                                                                                       | Risk                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `5e659f5`       | Contacts list loads its organizations with one `id in` query instead of two per row                                                                      | 70 → 8 queries; 2.3 s → 0.94 s; rendered page identical                                                            | none seen                                                                                  |
| `df5ecd0`       | Reports counts tasks from one read tallied in memory, not about three counts per person                                                                  | about 25 → 1 query; 2.4 s → 1.85 s; output identical for default and year ranges                                   | one read grows with tasks in the range (thousands is fine; revisit past tens of thousands) |
| `1d34eeb`       | Today's first-run check counts collections until one is non-empty                                                                                        | 41 → 36 queries                                                                                                    | none                                                                                       |
| `646eb91`       | Sidebar counts: settings and workflows start together, workflows reused for 60 s, browser asks at most every 30 s                                        | `/api/v1/nav/counts` 195 → 150 ms                                                                                  | counts may lag a minute behind a workflow edit                                             |
| `af0a847`       | Every read of a whole table runs one statement, not a count plus a select (the D1 chunking wrapper `installPagedFind` paginated its first read)          | statements per page: Today 36 → 27, Reports 26 → 17, Tasks 16 → 11, Deals 18 → 13, Leads 16 → 10, Projects 16 → 12 | none seen; a table of 90 rows or more still counts and pages as before                     |
| `(this commit)` | A client's page builds only the open tab: Overview 28 → 18 statements, other tabs 6 or 7 (0.3 s in dev); the client record is read once, not three times | tab switch about 0.4 s in dev, shifts land inside the 500 ms input window                                          | each tab click waits on the server; other record pages unchanged                           |
| `f099285`       | Phone timeline no longer inserts its toggle at hydration                                                                                                 | layout shift 0.200 → 0.000                                                                                         | none                                                                                       |
| `9a480a9`       | Currency change no longer rewrites every deal; logo upload keeps the old file until the new one is saved (UX 40, 41)                                     | n/a (data safety)                                                                                                  | existing deals keep their own currency; reports show a mixed-currency note                 |
| `f676e70`       | `OPS_LOG_SQL=1` query trace                                                                                                                              | n/a                                                                                                                | none; off by default                                                                       |

## Where it stands

Statements per page, seeded demo data, signed in as the owner, 2026-11-04, after `af0a847`. A page over its budget is open work.

| Page                                | Queries  | Budget |
| ----------------------------------- | -------- | ------ |
| Billing, Attendance                 | 4, 4     | 8      |
| My tasks, Organizations, Contacts   | 6, 6, 6  | 10     |
| Calendar, Inbox, Timeline           | 7, 7, 9  | 10     |
| Leads, Task board, Boards           | 10 to 13 | 12     |
| Tasks, Projects, Team, Sales, Deals | 11 to 13 | 12     |
| Reports                             | 17       | 20     |
| Today                               | 27       | 20     |

The next steps, in order of return: one shared read of settings plus saved views for list pages; a single read of the attendance rows Today asks for twice.

## Statements are not the whole time

In the dev server a request spends most of its time outside the database. For `/leads` (1.55 s, 10 statements) the first statement started 79 ms in, 226 ms of JavaScript ran between the first and second statement, and about 700 ms of rendering followed the last one. The dev server compiles and renders unminified code on one thread, so it cannot show whether the 200 ms target is met. Measure on a production build or a deployed tenant before spending effort on the render path.

## Measuring layout shift under load

`layout-shift.spec.ts` runs against the local app. For a throttled run, set CPU 4× and a 200 KB/s, 150 ms network in a Chromium session and watch `layout-shift` entries; the first throttled run found the phone timeline (0.200), and every other measured route is 0.000.

## Measuring on a real deployment

The local sandbox could not build or run the production bundle (one CPU, and the proxy refuses Cloudflare hosts), so the 200 ms target has not been measured. On a deployed tenant:

```bash
# 20 sign-ins' worth of timing for one page: time to first byte, signed in with a session cookie
for i in $(seq 20); do curl -s -o /dev/null -b cookies.txt -w "%{time_starttransfer}\n" https://<tenant>/tasks; done | sort -n | sed -n '10p;19p'
```

Report the median (10th) and the 95th percentile (19th) per page, and compare them with the statement counts above. Statements per page do not depend on the environment, so a page over its budget here is over it there too.
