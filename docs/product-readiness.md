# Product readiness for white-label sale

An honest account of what a buyer of a white-label licence gets today, and what stands between this product and a confident sale. It lists only what the repository's own docs and code show; nothing here is a measured customer result. Update it when a row changes.

## What a buyer gets now

| Area          | State                                                                                                                                                       | Source                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Isolation     | One Worker, D1 database and R2 bucket per customer; no shared rows                                                                                          | [ADR-0002](adr/0002-tenancy.md), [architecture](architecture.md) |
| Branding      | Name, logo, favicon, primary colour (contrast-checked) and radius per tenant, from `tenants/*.jsonc` and Settings, Branding                                 | [spec](spec.md), `server/branding/`                              |
| Language      | English and Spanish for every shell label; terminology renames group and link names per customer                                                            | `i18n/`, Settings, Terminology                                   |
| Sales         | Intake forms with a hosted page and embed code, lead and deal boards, saved views, bulk actions, conversion, playbooks that start a project from a won deal | [roadmap](roadmap.md) waves 5 and 10                             |
| Delivery      | Tasks (table, board, calendar, timeline), projects, repeating work, time logging, attendance, a Today screen per person                                     | README                                                           |
| Money         | Quotes and invoices; audit log                                                                                                                              | roadmap wave 11                                                  |
| Communication | Per-record email threads, templates, newsletter with unsubscribe, signed webhooks, personal API tokens                                                      | roadmap wave 10                                                  |
| Access        | Owner, manager and staff roles, record scope, groups, invitations, optional two-step sign-in                                                                | README                                                           |
| Data          | CSV import and export, archive with restore, demo dataset (`seed:demo`)                                                                                     | README                                                           |
| Navigation    | One model for sidebar, command menu, shortcuts and New menu                                                                                                 | [navigation design](design/navigation.md)                        |

## What blocks a confident sale

Ordered by how directly each one stops a buyer. Each has an owner document; none is solved by this page.

1. **Licence.** The README badge says proprietary, and the code-licence decision is open ([spec D-30, Q-001](spec.md); ADR-0003 is reserved). A buyer needs written terms before money moves.
2. **Provisioning is an operator task.** A new customer needs `pnpm tenant:new`, a provision run and a Cloudflare account with Workers Paid. Self-serve signup is designed, not built ([design](design/self-serve-saas.md), roadmap wave 7).
3. **Only one live tenant.** The pilot-week criteria (spec §20.6) are not measured, so there is no evidence of daily use by a second business ([roadmap](roadmap.md) wave 4).
4. **No client portal.** Clients cannot see their work or invoices; designed in [quotes, invoices, portal](design/quotes-invoices-portal-rules-audit.md), not built. Payments through a processor wait for a tenant account.
5. **No automation rules or custom record types.** Lead assignment rules exist; general "when X, do Y" does not. Gmail and two-way calendar sync, call logs and SMS campaigns are deferred or partial.
6. **Speed is unproven on real infrastructure.** Query counts are fixed on the worst pages ([performance](performance.md)); the 200 ms target has not been measured on Cloudflare.
7. **Open defects.** The [UX backlog](backlog/ux.md) lists a critical gap (the end-to-end suite still has no screenshot diffs), a settings navigation mismatch (UX 39) and silent report-range fallbacks (UX 42).
8. **Copy outside the catalogs.** Spanish workspaces still show English in record pages and most settings pages (UX 38).

## Suggested order

1. Decide the licence and write the buyer terms (item 1).
2. Fix UX 39 and 42, then add screenshot diffs (UX 3).
3. Measure [performance](performance.md) on a deployed tenant and close the listed hotspots.
4. Run the pilot week for a second business and record the §20.6 results (item 3).
5. Build the client portal, then self-serve provisioning (items 4 and 2).

## Demo path

`pnpm db:reset:local && pnpm seed:dev && pnpm seed:demo`, then `PORT=3001 pnpm dev`. Sign in as the owner from `scripts/seed/data.ts`. All names are fictional (Demo Agency, example.test).
