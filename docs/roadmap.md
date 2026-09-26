# Roadmap

The order in which open work ships. Each wave names the backlog entries it closes, what it depends on and how it is accepted; the entries themselves, with locations and fixes, live in [the code-health backlog](backlog/code-health.md), [the UX backlog](backlog/ux.md) and [the tooling and operations section](backlog/code-health.md#tooling-and-operations). Delete a wave when it ships, and add the next one at the bottom.

Waves 2 to 5 fix what a user of the current product hits; wave 6 turns the platform into a self-serve SaaS. Waves 2 and 3 can run in parallel, as they touch different files.

## 1. Release visibility

Production (`crm.mirchmedia.com`) runs release `v0.1.0` of `main`, but `/api/v1/health` still reports `version: "dev"`.

- Set `APP_VERSION` at deploy so `/api/v1/health` reports the live release (UX 31).
- Add a preflight to `scripts/deploy-tenants.ts` that fails before any remote step when a tenant's secret is missing (OPS-06).

Done when: `/api/v1/health` returns the release version after a deploy, and a release without a tenant secret stops before its first remote command.

## 2. Task surfaces

The task screens are where staff spend their day and where the worst UX findings sit.

- One task view for the panel and the full page, with a page header and no Close button; delete `TaskAssigneeForm` (UX 2). The geometry check in `tests/e2e/customer/route-health.spec.ts` turns green with this change.
- Editable task properties in the panel: stage, priority, assignees, dates and parent, each saving on change through `updateTask`, with the activity feed below (UX 1).
- Open a task by clicking anywhere in its row (UX 9); the calendar shows every task in a day (UX 4); subtasks open and can be added (UX 28); My tasks reuses the task table (UX 27); the task table becomes a card list on phones (UX 29).
- Move TaskSheet copy into the i18n catalog and split its page and sheet modes (code-health UI-01, UI-04).

Depends on: nothing. Done when: every change's gates pass against the running app at 1440px and 390px, and the task API endpoints (`/api/v1/tasks/...`) show each edit.

## 3. One error model and an identity module

Code-health refactor steps 1 and 2. Settings and membership are the last features that call Payload directly without a use case.

- Adapters return `Result` instead of throwing; client `catch` blocks report through one helper (DOM-09, WEB-22, WEB-23, WEB-24, SCR-09).
- One composition root, `apps/web/src/server/container.ts`, replaces the `get*Deps` files (ARCH-04).
- `packages/modules/identity` owns invite, resend, revoke and member role changes, with an in-memory double; the settings actions call it (ARCH-01, ARCH-06). Expose it on `/api/v1` with the `add-api-endpoint` skill.
- Remove the moved files from `PAYLOAD_IN_ROUTES_DEBT` (ARCH-02).

Depends on: nothing. Done when: `members.ts` has no `payload.` calls, the identity endpoints pass their gates, and the debt list is shorter.

## 4. CRM records

- Move lead move legality, display names, saved-view parsing and currency defaults into the CRM module (WEB-10, WEB-14, WEB-16, WEB-17).
- Generic record machinery: extend the contacts and organizations `directory-*` pattern to leads, deals and tasks, with one lost-reason dialog, one activity card and one stage picker (WEB-03 to WEB-09, WEB-27, WEB-31; UX 17, 25).
- Inline edit for every record field (UX 6), conversion that can attach to existing records (UX 7), and notes on records (UX 14).
- Expose the CRM use cases on `/api/v1`.

Depends on: wave 3 for the shared error model. Done when: leads, deals and tasks render through the shared components and the CRM endpoints pass their gates.

## 5. Design system and lists

- One view bar with search, filter and sort on every list (UX 8), used on tasks, leads, deals, contacts, organizations and projects.
- Replace native `<select>` and date inputs with `@ops/ui` components (UX 12); one view switcher (UX 19); bulk actions through the existing `DataTable` selection (UX 13).
- Kanban column sizing and add-to-column (UX 15); calendar drag to reschedule (UX 16); Gantt bar colours by stage (UX 23); smaller fixes UX 20, 22, 24, 26, 30, 32, 33.

Depends on: wave 4 for the generic record lists. Done when: no native `<select>` remains outside `packages/ui`, and every list page has the same bar.

## 6. Self-serve SaaS

Sign up, then automatic provisioning, as proposed in [the self-serve design](design/self-serve-saas.md). Its five phases are sub-waves: registry and API-driven provisioning, dispatch namespace and releases, public signup, custom domains, then plans and billing.

- Before phase 1: a neutral demo tenant with example.test identities and a real pipeline, used by `seed:dev` and the end-to-end suite instead of the Mirch Media data (UX 10, 11; code-health SCR-14).
- Resolve the design's open questions (D1 account limits, Workers for Platforms pricing, migrations inside a Worker, OpenNext upload to a dispatch namespace) with spikes, then record ADR-0005.

Depends on: wave 1. Can start alongside waves 2 to 5, since it adds `apps/control` and touches the product app only for its internal migrate endpoint and identity bindings. Done when: each phase's acceptance in the design doc is met.

## 7. Tooling and operations

The small items in [the tooling and operations backlog](backlog/code-health.md#tooling-and-operations), taken whenever a wave leaves slack: shrinking the three largest test files, screenshot diffs for the core surfaces (UX 3), knip production mode, the pre-commit hook decision, the stale provenance note in spec §22 and the merged remote branches.
