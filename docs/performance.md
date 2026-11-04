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

| Commit    | Change                                                                                                               | Before → after (dev sandbox)                                                     | Risk                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `5e659f5` | Contacts list loads its organizations with one `id in` query instead of two per row                                  | 70 → 8 queries; 2.3 s → 0.94 s; rendered page identical                          | none seen                                                                                  |
| `df5ecd0` | Reports counts tasks from one read tallied in memory, not about three counts per person                              | about 25 → 1 query; 2.4 s → 1.85 s; output identical for default and year ranges | one read grows with tasks in the range (thousands is fine; revisit past tens of thousands) |
| `1d34eeb` | Today's first-run check counts collections until one is non-empty                                                    | 41 → 36 queries                                                                  | none                                                                                       |
| `646eb91` | Sidebar counts: settings and workflows start together, workflows reused for 60 s, browser asks at most every 30 s    | `/api/v1/nav/counts` 195 → 150 ms                                                | counts may lag a minute behind a workflow edit                                             |
| `f099285` | Phone timeline no longer inserts its toggle at hydration                                                             | layout shift 0.200 → 0.000                                                       | none                                                                                       |
| `9a480a9` | Currency change no longer rewrites every deal; logo upload keeps the old file until the new one is saved (UX 40, 41) | n/a (data safety)                                                                | existing deals keep their own currency; reports show a mixed-currency note                 |
| `f676e70` | `OPS_LOG_SQL=1` query trace                                                                                          | n/a                                                                              | none; off by default                                                                       |

## Where it stands

Statements per page, seeded demo data, signed in as the owner, 2026-11-04. A page over its budget is open work.

| Page                                        | Queries  | Budget | Note                                                                                                        |
| ------------------------------------------- | -------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| Billing, Attendance                         | 4, 6     | 8      |                                                                                                             |
| Organizations, Inbox, My tasks              | 8, 8, 9  | 10     |                                                                                                             |
| Calendar, Timeline                          | 10       | 10     |                                                                                                             |
| Sales, Task board                           | 13, 12   | 14     |                                                                                                             |
| Tasks, Projects, Leads, Deals, Team, boards | 16 to 18 | 12     | each repeats the actor, settings and saved-view reads; Payload counts before every paginated read           |
| Contacts                                    | 8        | 10     |                                                                                                             |
| Today                                       | 36       | 20     | the task queues run overdue, due today, plan and candidates as separate reads, with a count and a read each |
| Reports                                     | 26       | 20     |                                                                                                             |

The next steps, in order of return: a Today read model that fetches the person's open tasks once and splits them in memory; skip Payload's total count on lists that show no page count (`pagination: false` with a limit); one shared read of settings plus saved views for list pages.

## Measuring layout shift under load

`layout-shift.spec.ts` runs against the local app. For a throttled run, set CPU 4× and a 200 KB/s, 150 ms network in a Chromium session and watch `layout-shift` entries; the first throttled run found the phone timeline (0.200), and every other measured route is 0.000.
