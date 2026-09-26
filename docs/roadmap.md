# Roadmap

The order in which open work ships. Every open finding in [the code-health backlog](backlog/code-health.md) and [the UX backlog](backlog/ux.md) is assigned to exactly one wave below; the backlogs hold each finding's location, evidence and fix. A wave with a plan in `docs/plans/` lists its tasks with owned files and gates. Delete a wave when it ships, and add the next one at the bottom.

Waves 2 and 3 run in parallel, as they touch different files. Wave 4 needs wave 2. Wave 7 turns the platform into a self-serve SaaS and can start once wave 1 ships, alongside the others.

## 1. Release visibility

Production (`crm.mirchmedia.com`) runs release `v0.1.0` of `main`, but `/api/v1/health` still reports `version: "dev"`.

- Set `APP_VERSION` at deploy so `/api/v1/health` reports the live release (UX 31).
- Add a preflight to `scripts/deploy-tenants.ts` that fails before any remote step when a tenant's secret is missing (OPS-06).
- If the tag-triggered release workflow stores `INTERNAL_SECRET_MIRCHMEDIA`, update it to the value rotated on 2026-09-26 (see the deploy runbook).
- Close the two security gaps: security headers on every response, and the spec's 404 for Payload's own password routes.
- Findings: UX 31; code-health OPS-06, SEC-01, SEC-02.

Done when: `/api/v1/health` returns the release version after a deploy, a release without a tenant secret stops before its first remote command, production responses carry the security headers, and Payload's own password routes return 404.

## 2. Task surfaces

Plan: [wave 2 plan](plans/wave-2-task-surfaces.md). The task screens are where staff spend their day and where the worst UX findings sit.

- One task view for the panel and the full page; editable properties with activity; row clicks; a calendar that shows every task; My tasks on the shared table; subtasks; a phone layout.
- Findings: UX 1, 2, 4, 9, 27, 28, 29; code-health UI-01, UI-02, UI-03, UI-04, UI-08, UI-10, UI-11, UI-16, UI-19, UI-24, WEB-29, WEB-30.

Depends on: nothing. Done when: every task in the plan is committed with its gates, and the geometry check in `tests/e2e/customer/route-health.spec.ts` passes.

## 3. One error model and an identity module

Plan: [wave 3 plan](plans/wave-3-error-model-identity.md). Code-health refactor steps 1, 2 and 5: settings and membership are the last features that call Payload directly without a use case.

- One composition root; adapters that return `Result`; one client error helper; `packages/modules/identity` with `/api/v1` endpoints; split mail, job, intake and directory files; a shorter Payload-in-routes debt list.
- Findings: code-health ARCH-01, ARCH-02, ARCH-04, ARCH-06, DOM-03, DOM-04, DOM-05, DOM-06, DOM-07, DOM-08, DOM-09, DOM-10, DOM-12, DOM-14, DOM-16, SCR-09, WEB-11, WEB-13, WEB-22, WEB-23, WEB-24.

Depends on: nothing. Done when: `members.ts` has no `payload.` call, the identity endpoints pass their gates, and no adapter file carries a file-wide lint waiver.

## 4. First-tenant go-live and pilot week

The spec's M8 and M9 milestones (spec §20, §21.2) for the Mirch Media tenant, run once wave 2 gives staff usable task screens. The tenant is live at `crm.mirchmedia.com`; the steps below are not verifiable from this repository and are confirmed with the owner first.

- Confirm or finish the M8 go-live items: the website lead forwarder (M8-W1, in the separate Laravel repository), the CSV imports (M8-W2), and outbound email, which `tenants/mirchmedia.jsonc` has disabled (`email.enabled: false`).
- Run the pilot week and measure the §20.6 criteria: every website lead lands in the app, active projects and open tasks live only in the app, every staff member signs in on at least three of five workdays and uses My tasks daily, no cross-scope visibility bug, and due-soon and overdue notifications verified.
- Turn the pilot's friction list into findings in [the UX backlog](backlog/ux.md) and assign them to waves.

Depends on: wave 2. Done when: the pilot outcome and friction list are recorded in `docs/history.md`.

## 5. CRM records

Code-health refactor steps 3 and 4: rules move out of the web layer, and leads, deals and tasks share the generic record machinery.

- Move lead move legality, display names, saved-view parsing and currency defaults into the CRM module; give use cases an explicit application layer.
- Extend the contacts and organizations `directory-*` pattern to leads, deals and tasks, with one lost-reason dialog, one activity card and one stage picker; inline edit for every field; conversion that can attach to existing records; notes on records; CRM use cases on `/api/v1`.
- Findings: UX 6, 7, 14, 17, 25; code-health ARCH-03, ARCH-05, DOM-02, DOM-15, DOM-18, WEB-03, WEB-04, WEB-05, WEB-06, WEB-07, WEB-08, WEB-09, WEB-10, WEB-12, WEB-14, WEB-16, WEB-17, WEB-18, WEB-20, WEB-21, WEB-26, WEB-27, WEB-28, WEB-31.

Depends on: wave 3 for the error model and composition root. Done when: leads, deals and tasks render through the shared components and the CRM endpoints pass their gates.

## 6. Design system and lists

- One view bar with search, filter and sort on every list; `@ops/ui` components instead of native selects and date inputs; one view switcher; bulk actions through `DataTable` selection.
- Kanban column sizing and add-to-column; calendar drag to reschedule; Gantt bars coloured by stage; one token set across the stylesheets.
- Findings: UX 8, 12, 13, 15, 16, 19, 20, 22, 23, 24, 26, 30, 32, 33; code-health UI-05, UI-06, UI-07, UI-12, UI-13, UI-14, UI-17, UI-20, UI-21, UI-23.

Depends on: wave 5 for the generic record lists. Done when: no native `<select>` remains outside `packages/ui`, and every list page has the same bar.

## 7. Self-serve SaaS

Sign up, then automatic provisioning, as proposed in [the self-serve design](design/self-serve-saas.md). Its five phases are sub-waves: registry and API-driven provisioning, dispatch namespace and releases, public signup, custom domains, then plans and billing.

- Before phase 1: a neutral demo tenant with example.test identities and a real pipeline, used by `seed:dev` and the end-to-end suite instead of the Mirch Media data; resolve the design's open questions with spikes, then record ADR-0005.
- Phase 1 replaces the operator CLI, so the provisioning-script findings are closed by deleting or rewriting that code rather than refactoring it.
- Findings: UX 10, 11; code-health ARCH-07, SCR-07, SCR-08, SCR-10, SCR-13, SCR-14, SCR-16, SCR-17, SCR-19, SCR-21.

Depends on: wave 1. Done when: each phase's acceptance in the design doc is met.

## 8. Tooling and operations

Taken whenever a wave leaves slack.

- Shrink the three largest test files; screenshot diffs for the core surfaces; knip production mode; the pre-commit hook decision; the merged remote branches; one shared exclusion list for the tooling configs.
- Findings: UX 3; code-health OPS-01, OPS-02, OPS-03, OPS-05, SCR-20.
