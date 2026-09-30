# Roadmap

The order in which open work ships. Every open finding in [the code-health backlog](backlog/code-health.md) and [the UX backlog](backlog/ux.md) is assigned to exactly one wave below; the backlogs hold each finding's location, evidence and fix. A wave with a plan in `docs/plans/` lists its tasks with owned files and gates. Delete a wave when it ships, and add the next one at the bottom.

Waves 2 and 3 run in parallel, as they touch different files. Wave 4 needs wave 2. Wave 7 turns the platform into a self-serve SaaS and can start once wave 1 ships, alongside the others.

## 1. Release visibility

Done: production (`crm.mirchmedia.com`) runs `v0.2.0`, `/api/v1/health` reports it, every response carries the security headers, Payload's own password routes return 404, and a release without a tenant secret stops before its first remote command.

- If the tag-triggered release workflow stores `INTERNAL_SECRET_MIRCHMEDIA`, update it to the value rotated on 2026-09-26 (see the deploy runbook).
- Findings: none.

## 2. Task surfaces

Plan: [wave 2 plan](plans/wave-2-task-surfaces.md). The task screens are where staff spend their day and where the worst UX findings sit.

- One task view for the panel and the full page; editable properties with activity; row clicks; a calendar that shows every task; My tasks on the shared table; subtasks; a phone layout.
- Findings: none.

Depends on: nothing. Done when: every task in the plan is committed with its gates, and the geometry check in `tests/e2e/customer/route-health.spec.ts` passes.

## 3. One error model and an identity module

Plan: [wave 3 plan](plans/wave-3-error-model-identity.md). Code-health refactor steps 1, 2 and 5: settings and membership are the last features that call Payload directly without a use case.

- One composition root; adapters that return `Result`; one client error helper; `packages/modules/identity` with `/api/v1` endpoints; split mail, job, intake and directory files; a shorter Payload-in-routes debt list.
- Findings: none. Done: every task in the plan is committed.

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
- Done: a form builder and hosted renderer for lead intake (§10.3). Under Settings, Intake, add questions to a form and it gets a public page at `/forms/<key>` and an embed snippet; answers go through the same intake endpoint and field mapping. The hosted page shows the tenant's Turnstile widget (`intake.turnstileSiteKey`); without a key it returns 404 in production. Open: file uploads and conditional questions.
- Done (v0.6.0–v0.8.0): configurable client onboarding — custom fields on organization, contact, lead and deal pages; stage requirements that name missing fields; playbooks that create a project from a won deal; intake answers mapped to lead fields and custom fields in Settings, Intake. Also done: CRM use cases on `/api/v1`.
- Done (v0.9.0): editable details on every record, deals on the shared record parts, conversion that attaches to existing records, notes on records, and one quick-create dialog for leads, contacts and organizations.
- Findings: code-health ARCH-03, ARCH-05, DOM-02, DOM-15, DOM-18, WEB-04, WEB-10, WEB-12, WEB-14, WEB-18, WEB-20, WEB-21, WEB-26, WEB-27, WEB-28.

Depends on: wave 3 for the error model and composition root. Done when: leads, deals and tasks render through the shared components and the CRM endpoints pass their gates.

## 6. Design system and lists

- Done: no native `<select>` remains outside `packages/ui`; multi-selects are checkbox lists.
- One view bar with search, filter and sort on every list; `@ops/ui` date inputs; one view switcher; bulk actions through `DataTable` selection.
- Kanban column sizing and add-to-column; calendar drag to reschedule; Gantt bars coloured by stage; one token set across the stylesheets.
- Findings: UX 8, 12, 13, 16, 33, 34, 35; code-health UI-05, UI-07, UI-12, UI-13, UI-14, UI-17, UI-21, UI-23.

Depends on: wave 5 for the generic record lists. Done when: no native `<select>` remains outside `packages/ui`, and every list page has the same bar.

## 7. Self-serve SaaS

Sign up, then automatic provisioning, as proposed in [the self-serve design](design/self-serve-saas.md). Its five phases are sub-waves: registry and API-driven provisioning, dispatch namespace and releases, public signup, custom domains, then plans and billing.

- Done: a neutral demo workspace (Demo Agency, example.test identities, fictional clients) seeds `seed:dev` and the tests. Before phase 1: resolve the design's open questions with spikes, then record ADR-0005.
- Phase 1 replaces the operator CLI, so the provisioning-script findings are closed by deleting or rewriting that code rather than refactoring it.
- Findings: UX 10, 11; code-health ARCH-07, SCR-07, SCR-08, SCR-10, SCR-13, SCR-16, SCR-17, SCR-19, SCR-21.

Depends on: wave 1. Done when: each phase's acceptance in the design doc is met.

## 8. Tooling and operations

Taken whenever a wave leaves slack.

- Shrink the three largest test files; screenshot diffs for the core surfaces; knip production mode; the pre-commit hook decision; one shared exclusion list for the tooling configs.
- Findings: UX 3; code-health OPS-01, OPS-02, OPS-03, SCR-20.

## 10. Sales polish

Plan: [wave 10 plan](plans/wave-10-sales.md). Owner priority: the lead pipeline from first contact to an onboarded client, and a newsletter.

- Done (v0.9.0–v0.9.3, verified signed in on production): quick create, notes, editable details, filters by owner and source, saved views, bulk owner assign and bulk stage move, phone cards, add-to-column on the board, duplicate warning, next-action date with an overdue marker, convert that works without a company, and links between lead, deal and onboarding project.
- Done (v0.9.4–v0.9.5): outbound email from `notify.mirchtravel.com`, and the newsletter: opt-in checkbox on contacts, a test send and a send to all subscribers, and a signed unsubscribe link, verified signed in on production.
- Website sign-ups: a form question mapped to the lead's "Newsletter opt-in" (Settings, Intake) lands as a lead, and converting that lead ticks the contact. A person reviews every subscriber before anything is sent.
- Campaign history: each newsletter email is recorded on its contact (Email tab) and the newsletter page lists the last ten campaigns.
- Wave 9 picks built from this: automation rules (new leads are assigned to people in turn, per source), email templates (insertable in the email box) and a first-response target (leads waiting past it are marked). Set them under Settings, Sales. Archive for leads, deals, contacts and organizations is built (owners and managers). Deferred: outgoing webhooks, call logs, Gmail and calendar sync, custom record types. Next for campaigns: a durable outbox with retries, pause and quiet hours, then SMS ([design](design/campaign-outbox.md)).
- Findings: none.

Depends on: wave 5. Audiences: name lists on the newsletter page, tick them on contacts, and pick one (or everyone) when sending. Done when: v0.9.13 is verified on production.

## 9. Reference feature gaps

Features the reference products have that this product lacks. Each is marked "decide before building": custom record types; automation rules (when X, do Y); Gmail and calendar sync; outgoing webhooks; email templates; call logs; response-time targets (SLAs); task labels, task relations (blocks/blocked by), cycles, estimates.

Done when: each feature has a yes/no/defer decision recorded in an ADR or spec section, or is assigned to a wave.
