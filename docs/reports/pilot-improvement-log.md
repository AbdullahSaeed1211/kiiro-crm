# Pilot improvement log

This log records implementation decisions and direct acceptance evidence for a Mirch agency pilot. The product spec remains authoritative for architecture, tenancy, and security.

## Starting state

- The checkout was clean at `4f5b2fb` and fast-forwarded to `origin/main` at `0ca9632`. The separate inbox worktree is clean. Other listed worktree paths are missing and remain untouched.
- Node 22.22.3 and pnpm 10.34.5 are available. The local Next.js server is at `http://localhost:3001`; port 3000 belongs to another local app.
- Local sign-in succeeds with the owner account documented in `docs/spec.md` and `scripts/seed/data.ts`. The README instead lists `mirchads@example.test`, which fails, and still describes M1 as the current milestone.
- `/organizations` shows 13 records. AGR Gold has no website, email, phone, contacts, or deals; it has one project and its visible owner is Demo Manager. These are current local seed values, not verified client data.
- The task list showed 24 tasks and displayed a dash in the project column. The AGR Gold project List tab showed its kickoff task linked to the project, so the list display was misleading. No task relationships are inferred from titles.
- Dashboard New task opens the global task quick-add with only a title field. Organization New task carries the organization ID and a suggested title into the same flow.
- The six reference clones (Twenty, Frappe CRM, Plane, Huly, Corteza, and Odoo) are present under the sibling `crm/references` directory. No source code has been copied into the project; references inform behavior only.

## Decisions

- Keep unknown client fields empty and preserve existing record relationships. Improve the product's ability to show what is known and make the next data-entry or work action explicit.
- Verify real user flows in the local browser at desktop and 390 px. Name and document local test records; keep all writes inside the demo workspace.
- Do not access production D1 data, send email, rotate secrets, or bypass the documented release gates.

## Checkpoints

| Checkpoint                                                        | Evidence                                                                                                                                                                                                                                                                                                                              | Status   |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Repository and local pilot baseline                               | Clean fast-forward to `0ca9632`; local sign-in and organization/task routes observed on 2026-09-24                                                                                                                                                                                                                                    | complete |
| Task context in the task table                                    | `pnpm typecheck`; 31 focused work tests; desktop and 390 px browser view; horizontal scroll; keyboard Enter opened the linked project; labels use permission-scoped project or CRM reads                                                                                                                                              | complete |
| Contextual task creation                                          | `pnpm typecheck`, lint, brand, vocabulary, i18n, disable, and docs checks; 31 focused work tests; browser created a local project task with high priority, description, and Sep 28 due date; AGR Gold action prefills record context and title; 390 px form has no horizontal overflow                                                | complete |
| Worker-preview E2E, accessibility and mobile prefetch diagnostics | Isolated local Worker preview; 45 passed, 1 mobile mouse-drag case skipped; desktop and iPhone 13 emulation; 34 customer routes plus record details audited; 390 px shell/list/record/sheet screenshots saved; Gantt vendor widget excluded with findings documented; no outbound email; aggregate gates recorded in M3-L1 attempt 21 | complete |
| Gantt accessibility remediation                                   | M3-L1 attempt 23; `pnpm verify` and scope checks pass; Worker-preview axe route audit passes on desktop and iPhone 13 emulation with Gantt included; compact chart and grid modes audited; no CRM records were written                                                                                                                | complete |
| Mobile timeline and Safari hydration follow-up                    | M3-L1 attempt 29; `pnpm verify` and scope checks pass; Worker-preview E2E passes 48/48 with no skips; task-board keyboard movement and mobile touch-event timeline drag persist and restore; 390px timeline has no document overflow; no client records or placeholder copy created                                                   | complete |
| Task panel source preservation                                    | M3-L1 attempt 30; `pnpm verify` and scope checks pass; Worker-preview E2E passes 48/48; task table, board, and My Tasks preserve their source URL, focus, and layout when opening and closing task panels on desktop and mobile; no client records or placeholder copy created                                                        | complete |
| Notification task context                                         | M3-L1 attempt 33; `pnpm verify` and scope checks pass; Worker-preview E2E passes 48/48 serially; an intercepted unread task alert sends the mark-read request, opens the task panel over Calendar, preserves the selected month in `returnTo`, and Escape restores that month; no notification or CRM record was created              | complete |
| Task drawer scroll behavior                                       | M3-L1 attempt 32; `pnpm verify` and scope checks pass; Worker-preview E2E passes 48/48 serially; temporary hidden overflow fixture keeps the drawer footer visible while content scrolls and Calendar position remains fixed; no record content was changed                                                                           | complete |

The browser task named `CRM pilot task creation smoke` was created in the seeded local development database to verify persistence. It is local demo data and is not production customer data.
