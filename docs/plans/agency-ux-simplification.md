# Agency UX simplification plan

## Decision

Refine the existing product around daily agency work. Do not rebuild the CRM or add another dashboard framework. The largest opportunity is to make existing capabilities easier to find, trust and act on.

This is a proposal and execution backlog for the owner and implementers, based on source inspection, official product documentation and a read-only production review on 2026-10-22. The backlog includes dependencies, file ownership, recovery rules and release criteria. It does not authorize data cleanup, change the product specification or claim implementation. The [daily-work checklist](../ux/agency-daily-work.md) remains the acceptance ledger; the [reference contract](../ux/reference-contract.md) owns reference and licensing requirements.

The first release should answer four questions without training:

1. What do I need to do now?
2. Which client or internal project is this for?
3. Who is responsible, and when is it due?
4. What action moves it forward?

## Evidence and limits

Production was reviewed using the existing owner session. Attendance, Today, the October calendar, the organization list and Austin Optics' overview were inspected. This was not a complete role, mobile, accessibility or performance audit. No production records were changed. Counts below are observations, not permanent product facts.

| Observed or inspected                                                                                                                                     | Implication                                                                                                                                         | Priority |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Today showed 147 overdue tasks; its first five were recurring channel-work items dated October 9                                                          | Determine whether the backlog is genuine, historical, duplicated or incorrectly scheduled before making it visually dominant. Do not assume a cause | P0       |
| October calendar days showed two chips plus 68 or 128 more items                                                                                          | The overflow treatment is improved, but a month grid alone cannot prioritize this volume                                                            | P0       |
| Attendance showed earlier-time reporting, timezone and a note before the primary button; history exposed seven columns, including both receipt timestamps | Preserve the audit model, simplify the default interaction                                                                                          | P0       |
| Organizations showed 17 rows, blank websites and zero open-deal counts; import/export remained prominent                                                  | The default list is a generic CRM directory, not an agency delivery overview                                                                        | P1       |
| Austin Optics' overview linked its project and showed empty contacts/deals; no next delivery or review summary appeared in that overview                  | Bring delivery context into the client entry point without duplicating project records                                                              | P1       |
| Today already has contextual queues; Settings already separates common and advanced areas                                                                 | Improve these implementations rather than build replacements                                                                                        | Preserve |
| Content has its own route, but is absent from the main navigation configuration                                                                           | Make content planning discoverable to permitted delivery roles                                                                                      | P1       |
| Attendance and content loaders convert unsuccessful results to empty arrays                                                                               | Show a retryable read error, not a false empty state                                                                                                | P0       |

Source locations at the review baseline:

- `apps/web/src/app/(app)/attendance/workspace.tsx:34`: exception controls precede the primary action; the note is always visible at line 72.
- `apps/web/src/app/(app)/attendance/history.tsx:58`: seven default columns; line 89 supplies pagination even for an empty bounded history.
- `apps/web/src/app/(app)/attendance/page.tsx`: unsuccessful attendance reads become empty history.
- `apps/web/src/app/(app)/content-calendar/page.tsx:45`: unsuccessful content reads become empty content.
- `apps/web/src/app/(app)/content-calendar/content-calendar-view.tsx`: publication dates are grouped through UTC `toISOString()`; calendar items link to the project rather than a specific content detail. Review timezone-boundary behavior before changing it.
- `apps/web/src/app/(app)/app-navigation.ts`: work navigation includes projects and tasks, but no content entry.
- `apps/web/src/app/(app)/today-queue.tsx`: common row action opens the task; a clear direct action can be added where the domain permits it.

The notification badge displayed 99. Its precise count semantics and underlying notification quality were not audited. Neither the backlog's cause nor production CLS/INP was measured in this pass.

## What the references actually contribute

These are selected source-level patterns, not claims that every reference was exhaustively audited. Adapt behavior to Kiiro's workflows; do not import six competing design systems.

| Reference and inspected component                                                                                                                                  | Useful pattern                                                           | Application here                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [Frappe ViewControls](https://github.com/frappe/crm/blob/2f6435d/frontend/src/components/ViewControls.vue)                                                         | Responsive filters and a save action tied to changed view configuration  | One consistent list toolbar; show save-view controls when relevant, not permanently  |
| [Twenty ViewBar](https://github.com/twentyhq/twenty/blob/211303ad/packages/twenty-front/src/modules/views/components/ViewBar.tsx)                                  | Separate view selection, options and changed-view actions                | Stable view context and a predictable More menu; avoid copying every control         |
| [Plane list block](https://github.com/makeplane/plane/blob/2f895b8/apps/space/components/issues/issue-layouts/list/block.tsx)                                      | Compact contextual rows, selectable properties and URL-backed peek state | Open records without losing the underlying list, filters or position                 |
| [Huly Activity](https://github.com/hcengineering/platform/blob/63e28dc/plugins/activity-resources/src/components/Activity.svelte)                                  | Filterable activity with focus and scroll handling                       | Human-readable event history that does not pull the reader away from their place     |
| [Corteza record-list configurator](https://github.com/cortezaproject/corteza/blob/3835dfc/client/web/compose/src/components/PageBlocks/RecordListConfigurator.vue) | Field selection and editability belong to configuration                  | Give admins configuration; give staff a useful default, not a configuration exercise |
| [Odoo task views](https://github.com/odoo/odoo/blob/c50a4e0/addons/project/views/project_task_views.xml)                                                           | Personal tasks, assignee/project grouping and explicit deadline filters  | Consistent Mine/Team scope and clear Today/Overdue/This week groupings               |

Repository license rules still apply. Copy permitted code only after checking the exact file's license and retaining required notices. Otherwise reproduce the behavior with existing components.

Agency-product research supports the same direction:

- **Personal execution separate from overview.** Teamwork distinguishes Home from My Work, and its task table groups work around due dates. Keep Today short and make My work the place to execute. [Teamwork navigation](https://support.teamwork.com/projects/team-member/team-member-step-1-find-your-way-around-teamwork-com), [task table](https://support.teamwork.com/projects/my-work/use-my-tasks-table-view).
- **Actionable groups, not decorative cards.** ClickUp's My Work card separates today, overdue, upcoming and unscheduled work. Use this grouping where it helps; do not copy a configurable card builder. [ClickUp My Work](https://help.clickup.com/hc/en-us/articles/18947060934423-Use-the-My-Work-card).
- **Explicit review outcomes.** Approval work needs an accountable reviewer and distinct approval/change-request outcomes, not an ambiguous done checkbox. [Asana approvals](https://help.asana.com/s/article/approvals).
- **Do not rebuild publishing approval.** GoHighLevel supports post approvals and external approval links. Keep publishing approval there by default; CRM can coordinate design review and handoff. Its documentation currently notes limitations on mobile external approval, so test that path before recommending it to clients. [GHL approval flow](https://help.gohighlevel.com/support/solutions/articles/48001229834-post-approval-flow-in-social-planner), [external approval links](https://help.gohighlevel.com/support/solutions/articles/155000007623-external-link-approval-flow-in-social-planner).
- **Do not invent capacity.** Productive compares booked work with available capacity. A task count or attendance duration is not equivalent. Until estimates, availability and budgets exist, label our charts as counts and recorded hours. [Productive capacity indicators](https://help.productive.io/en/articles/4575430-capacity-indicators).
- **Disclose complexity progressively.** Frequent actions belong on the first screen; exceptions belong behind an explicit secondary control. [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/).

## Target information architecture

Keep routes stable. This is a proposed navigation grouping, not a new permissions model:

```text
Today                 What needs attention; one action per item
Work                  Mine / Team | Tasks | Projects | Calendar | Content | Repeating
Clients               Client overview | Delivery | People | Drive links
Sales                 Calling workspace | Leads | Deals | Appointments
Team                  People | Assignments | Attendance
Reports               Delivery | Open work | Sales sources

Secondary utilities   Inbox where enabled | Settings | Billing where permitted
```

Areas and views appear only for permitted profiles. Work defaults to Mine for staff; authorized people can switch to Team. The Team area groups existing people and attendance capabilities without granting new directory access. Staff can reach their own attendance directly from Today even when team administration is unavailable.

Content is a prominent Work view. A client's content tab filters those same records, and the calendar presents their dates. Projects and tasks follow the same rule: multiple entry points, one underlying record and one editing contract. No new records are created merely to fit the navigation.

Keep team project access governed by existing server policies, not by the selected view. Preserve existing URLs and deep links. Reports and Settings keep explicit labels instead of disappearing into a generic More category. Preserve quick access to Inbox where enabled; do not bury unread communication merely to hit a navigation-item quota.

For Kiiro, the organization label can become “Clients” through tenant terminology. Internal agency work remains clearly identified. Other tenants retain their vocabulary. Job responsibilities such as designer, developer and PR remain separate from authorization roles.

Treat this structure as the working hypothesis for implementation. Agent walkthroughs can expose inconsistencies, but cannot establish that staff understand every label. Check realistic findability tasks with staff when available, and record that limitation when they are not. [Tree-testing guidance](https://www.nngroup.com/articles/tree-testing/).

## Same-day release target

Prioritize a coherent daily-work release over completing every proposed feature. The owner's target is 2026-10-22. No measured delivery estimate currently establishes that the whole backlog fits that day. Do not turn that target into a claim of completion or quietly reduce acceptance standards.

Freeze the navigation hypothesis above for this release candidate. Reopen it only when a concrete workflow cannot be found or completed. Use existing views and components before adding routes, fields or dependencies. Preserve the broader execution backlog for work outside the daily-work cut.

The same-day candidate consists of attendance simplification, truthful read/error states, clear personal work, contextual client entry points and usable record panels. Include navigation regrouping only when its routes and role behavior can be verified together. Prioritize a broken existing workflow over a new template, chart or reminder preference.

| Must be clear before release       | Acceptance requirement                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Where to start                     | The first screen identifies the person's next action and their work scope. Avoid competing primary buttons for unrelated workflows   |
| Where work belongs                 | Client delivery and internal agency work are distinguishable. A person sees recognizable names, not storage IDs                      |
| What can be saved now              | Rough capture asks only for valid minimum context. Additional requirements appear at the transition that needs them                  |
| What happens to edits              | A failed save preserves input. Closing an edited form either saves a supported draft or warns about unsaved changes; no silent loss  |
| What a date means                  | Date-only deadlines remain date-only. Timed events show the relevant timezone; reported attendance and receipt times remain distinct |
| Whether the action worked          | Pending, success, conflict and failure are visible. Duplicate clicks cannot create duplicate business records                        |
| How to get back                    | Close, Escape, backdrop and browser Back follow the established panel contract. Restore the prior scope, position and focus          |
| Whether the page is stable         | Keep static shell and actions visible during loading. Long titles, narrow screens, keyboard focus and reduced motion remain usable   |
| Whether information is trustworthy | Failed reads never appear as empty success. Totals match drill-downs. Uncertain historical records remain identified and intact      |
| Whether the release is live        | The pushed commit, deployed version and observed changed behavior agree. A local screenshot or green build is insufficient           |

The lead starts with P00/P01 and the smallest independently shippable slice, P02/P03. P04's read-only provenance audit can proceed independently. Expand into P05/P06 and selected P07/P10 work only after the earlier slice passes. Record partial package scope; do not mark an entire package complete for its same-day subset.

Defer new template capabilities, a dependency graph, report expansion and new notification preferences if they threaten the accepted daily-work release. Security, data integrity, role boundaries and working core interactions remain release blockers. Cosmetic refinements that do not obstruct work can remain explicit follow-ups.

Measure navigation steps and inspect the running UI before the release. Staff validation is valuable when available, but lack of it must be reported rather than replaced with an agent's assertion of perfection. Deliver the verified slice, list what remains and retain the rollback reference.

## Batch A: Make the day usable

Ship this before broader visual changes. Estimated relative effort: small for attendance, medium for queue refinement, unknown for data reconciliation until provenance is inspected.

### A1. Attendance with one obvious action

- Put status and Check in / Check out first. Show the recorded start time when checked in.
- Put “Report an earlier time” and “Add a note” below the primary action. Reveal date/time and a required reason only when earlier-time reporting is selected.
- Default personal history to Day, In, Out and Duration. Team history adds Person. Receipt timestamps, reported timestamps and notes remain available in row details.
- Replace an empty table and disabled pagination with a short first-use message. Do not imply that the latest 100 records are the complete history; add real paging or a clearly bounded range when needed.
- Keep the authoritative server receipt time immutable. Preserve the existing one-open-session, overlap, backdate and access rules. Do not add automatic late/absent labels without shift definitions.

**Files:** `attendance/workspace.tsx`, `attendance/history.tsx`, `attendance/page.tsx`, `attendance/use-punch.ts`, `i18n/attendance-copy.ts` under `apps/web/src`.

**Accept:** ordinary check-in/out takes one action after opening the page; pending state prevents duplicate clicks; success survives reload; an exception is discoverable without dominating the screen; audit detail remains accessible. Verify the existing backend invariants, not a second attendance implementation.

### A2. Trustworthy queues before prettier counts

- Audit the 147 overdue items by source, recurrence series, client, assignee and status. Sample each source category and compare it with the original import or work order.
- Produce a proposed reconciliation list with reasons. Distinguish genuine overdue work from historical publishing records and uncertain records. Never bulk-complete, delete or reschedule items because a date looks old.
- Make Today show a bounded, explainable priority list with an exact drill-down. Add due-today and waiting-for-review work where supported. Avoid counting the same item in multiple adjacent time buckets without clear labels.
- Offer a direct safe action where appropriate: complete an ordinary task, open a callback, review a deliverable. Respect stage requirements and stale-edit conflicts.
- Audit notification deduplication, read state and destination links. A badge must lead to useful actions, not an undifferentiated backlog.

**Files:** `(app)/page.tsx`, `today-work.tsx`, `today-queue.tsx`, relevant server read models and notification use cases. Data changes require a reviewed reconciliation manifest, backup and recoverable operations.

**Accept:** queue counts match filtered lists; personal and team scopes agree with server permissions; no due-today item is mislabeled overdue in the relevant timezone; a person can explain why each shown item needs attention.

### A3. Calendar for decisions, not just density

- Keep month for planning; provide a clear agenda/week route for daily execution. Reuse an existing view if one satisfies the need before adding another calendar engine.
- Keep Mine/Team and person filters visible and persistent in the URL. Distinguish tasks, callbacks, appointments and publication records with text/icon cues as well as color.
- Preserve the existing compact chips, More popover and full-title/time previews. Opening a record must retain month, scope, scroll position and keyboard focus on close.
- Keep date-only deadlines distinct from timed events. Define which timezone controls publication-day grouping and month boundaries; use the same definition in queries and display.
- Do not manufacture dates for unscheduled work. Show it in a separate actionable queue.

**Accept:** crowded days remain operable without nested cell scrollbars; the same record is reachable from agenda and month; midnight and daylight-saving boundary cases appear on the intended day; phone close/back behavior preserves context.

## Batch B: Connect agency delivery

Depends on A's scope and data decisions. Relative effort: medium to large; the work is connecting existing records, not recreating CRM entities.

### B1. A client overview that answers delivery questions

Change default client-list columns to Client, Responsible person, Active work and Next due item where those values can be computed reliably. Keep websites, sales totals and updated timestamps available through column options. Move import/export under More.

On the client overview, prioritize next deliveries, items awaiting review, responsible people and linked projects. Keep contacts, deals and audit metadata in their existing areas. Add clear links to brand guidelines and Drive assets; missing assets should say “Add Drive link,” not produce an empty media library. Do not infer that an organization named “Dev work” is disposable; review its intended classification first.

**Files:** `(app)/directory-list-view.tsx`, `organization-record-view.tsx`, `organizations/page.tsx`, `organizations/[id]/page.tsx`, their read-model queries and shared record components.

**Accept:** opening a client identifies what is next, who owns it and where the brief/assets are; empty sales fields do not dominate a delivery client; aggregates use permitted records without per-row query waterfalls.

### B2. Monthly content workbench

Make the content route discoverable and organize it around a client and delivery cycle. Reuse the current tasks, content items and deliverable approvals. First map the workflow to existing states; add schema only for information that cannot be represented without ambiguity.

```text
Brief / work order → Assigned design → Internal review → Ready for GHL
                                                       ↓
                                   GHL approval → Scheduled → Published / Failed
```

- For Kiiro, configure work orders due by the 23rd and design delivery by the 3rd of the following month. These are tenant settings, not global constants.
- Keep design delivery dates separate from publication instants. Do not backdate historical designer obligations from imported post dates.
- Show client, cycle, assignee, delivery deadline, review state, Drive link and GHL reference together. Require only a title and necessary ownership context for rough capture; enforce later-stage requirements at transition time.
- Show an unscheduled draft queue alongside the publication calendar. Open a specific content item from its calendar entry instead of sending the user to a generic project overview.
- Treat each monthly work order as its own occurrence. Verify whether current recurrence semantics can create the next month's work even while an earlier occurrence is unfinished; do not create a second scheduling engine by default.
- Make scheduling generation idempotent per tenant/client/cycle. Re-running an import or scheduler must not duplicate work orders or reminders.
- Mark imported publishing status with its source and observation time. A one-time backfill is not a live integration. Start with explicit GHL links and manual reconciliation; scope automated synchronization separately after checking API access, available events and failure recovery.
- “Approved by client” must distinguish an authenticated client response, an imported GHL result and a staff-recorded response. Do not represent one as another.

**Files:** `(app)/content-calendar/*`, `app-navigation.ts`, project deliverable components, `packages/modules/work`, relevant Payload repositories and existing recurring-job adapters.

**Accept:** one upcoming client cycle can be followed from brief to published reference without duplicate tasks; Drive remains the media source; a failed publication is visibly different from pending design; overdue design remains visible when a new month starts.

### B3. Role-first entry points and capture

Reuse current permission roles and work profiles. Delivery staff start with their assignments and review feedback. Sales staff start with assigned leads, due calls and appointments. Owners see exceptions across the agency. Do not equate hiding a link with denying access.

Provide contextual quick-add actions that inherit client/project context. Keep the existing conditional callback and appointment fields rather than introduce another intake form. Retain the common/advanced Settings structure; refine labels and grouping only where a real task is hard to find.

**Accept:** a designer can find their next deliverable; a caller can record an outcome and schedule the next action; an owner can find blocked work; all three flows work without visiting workspace configuration.

## Batch C: Consistency, speed and useful reporting

Apply after A and B agree on screen structure. Relative effort: medium; measure before expanding scope.

### C1. Shared interaction contracts

Use one shared toolbar pattern, one record-panel behavior and the current `@ops/ui` primitives. Establish default columns per object rather than forcing every list into identical fields. Search, filter, sort, pagination and panel state must survive back/forward navigation. Editing should preserve input on failure and explain conflicts.

Show distinct loading, empty, filtered-empty, forbidden and failed states. Fix the read-error masking identified above. Keep static navigation, headings and controls visible during loading; skeletonize only unresolved data. Use consistent compact spacing, clear focus states and restrained motion. Images serve identification or creative review; avoid decorative dashboard art and redundant avatars. Apply the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) to changed components, not as a reason for unrelated cosmetic churn.

### C2. Diagnose perceived slowness at the right layer

Measure navigation and key actions before and after changes, separating browser rendering, network latency, Worker execution and database work. Low median Worker CPU does not establish fast end-to-end interactions.

Keep the current Next.js, Payload and Cloudflare architecture. Prefer scoped read models, field projections, bounded pagination, parallel independent reads and aggregation without N+1 queries. Add indexes only after inspecting actual query patterns. Avoid global mutable user-data caches; tenant and actor permissions must remain part of any cache design.

Use optimistic updates only for reversible actions with explicit rollback and conflict handling. Attendance receipt times and approval provenance remain server-authoritative. Reserve layout dimensions for logos, rows and placeholders; do not replace the whole page when a small region changes.

**Targets, not measured results:** good field Core Web Vitals at the 75th percentile are CLS ≤0.1, INP ≤200 ms and LCP ≤2.5 s. A small pilot may lack enough field data; record repeatable lab traces and their device/network conditions without calling them field proof. [Threshold definitions](https://web.dev/articles/defining-core-web-vitals-thresholds).

### C3. Charts that answer an agency question

Start with three views: deliveries due versus completed for a selected period, open work by responsible person, and leads by source. Each chart must drill down to the records counted, disclose filters and show the unit. Do not label task counts as capacity or attendance as productive effort. Retainer profitability and utilization wait for real budgets, estimates, billable time and availability. Avoid a configurable dashboard builder until fixed views fail a demonstrated need.

## Additional agency improvements

Include these bounded improvements after daily actions and client context work. Inspect the existing implementation before adding any field or component. An existing capability earns a refinement or verification task, not a duplicate feature.

| Improvement                          | Smallest useful scope                                                                                                               | Boundary                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Quick capture and triage             | Save a rough task, lead or content idea with the minimum valid context. Show missing assignment or scheduling in a triage queue     | Do not require a complete brief to capture an idea; do not invent an owner or deadline                                    |
| Reusable work templates              | Preview tasks, relative dates and role assignments before applying a tenant-owned template to a project                             | Extend current playbooks; keep explicit Kiiro monthly dates separate from generic relative-date rules                     |
| Waiting-on handoffs                  | Show a reason, responsible reviewer or next actor, and an optional next-check date                                                  | Reuse workflow states and review records; defer a general dependency graph unless ordinary handoffs cannot be represented |
| Notification control                 | Read, act, dismiss or snooze personal reminders with clear counts and source links                                                  | Snoozing a reminder must not change the task deadline or erase overdue status; no new outbound channels by default        |
| Role-specific first use              | Show assigned work, check-in and the relevant first action. Explain an empty assignment list and how to contact the workspace admin | Preserve the current account model; do not require email verification or change credentials as part of UX work            |
| Contextual search and saved defaults | Search recognizable titles with client, project and person context; retain permitted personal view preferences                      | Search must enforce server scope. A preference is never an authorization rule                                             |
| Safe bulk work                       | Preview scope when assigning people or changing dates across selected items; show per-item failures                                 | Reuse existing bulk commands. Confirm destructive operations and do not build an unreliable universal undo feature        |
| Client readiness                     | Show missing brief, Drive link, responsible person or review decision for a chosen cycle                                            | This is an actionable checklist, not a speculative client-health or employee-performance score                            |

The current playbook contract contains a name, won-deal trigger and tasks with relative due days in `packages/modules/work/src/domain/playbooks.ts`. Role placeholders and previewed application are proposals, not verified capabilities. Teamwork's template flow provides a useful reference for previewing dated tasks and resolving role placeholders. [Task templates, reviewed 2026-10-22](https://support.teamwork.com/projects/templates/using-task-list-templates).

Do not add email digests, GHL write integration, payroll, resource forecasting or financial retainer automation to this release. Each needs configuration or business data that this plan does not establish. Produce a short follow-on proposal only when the implemented workflow demonstrates the need.

## Agent execution backlog

All packages below are **planned**, not assigned or implemented. The lead records status and evidence in the work record defined below when execution starts. Existing A/B/C sections own the product requirements; these packages own order and dispatch scope.

Paths beginning with `(app)` are relative to `apps/web/src/app`. File families below identify ownership candidates. Before dispatch, the lead resolves exact files, including copy catalogs and tests, and reserves them for one worker. Directory labels are not permission to edit every file beneath them.

| ID  | Package and completion result                                                                                                                                                | Dependencies                | Owner and file boundary                                                                                                  | Size estimate |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------- |
| P00 | Establish branch, live version, dirty-file ownership, available credentials and failing baseline gates. Record a release plan without exposing secrets                       | None                        | Lead; read-only baseline, work record                                                                                    | S             |
| P01 | Set shared contracts: scope, dates/timezones, content-to-task relationships, source provenance and UI states. Map requirements to existing fields before proposing additions | P00                         | Lead; decision register and scoped platform/module contracts                                                             | M             |
| P02 | Deliver A1 attendance simplification and real history boundaries                                                                                                             | P01                         | UI worker; attendance components and attendance copy. Backend pagination changes require lead contract review            | S             |
| P03 | Deliver explicit retryable read failures for attendance/content; preserve input and distinguish filtered-empty states in touched routes                                      | P01                         | UI worker; loaders and result presentation. Serialize attendance edits after P02                                         | S             |
| P04 | Classify overdue/imported/recurring records and produce a non-destructive reconciliation proposal                                                                            | P00                         | Data worker; read-only queries and sanitized findings. No production mutations                                           | M/unknown     |
| P05 | Deliver A2 actionable Today queues with scoped totals and direct safe actions                                                                                                | P01, P04                    | UI worker; Today components, copy and approved dashboard read-model changes                                              | M             |
| P06 | Deliver A3 calendar scope, agenda access and timezone-consistent record previews                                                                                             | P05                         | UI worker; calendar surfaces and exact shared calendar files reserved by the lead                                        | M             |
| P07 | Deliver B1 client delivery overview, useful list defaults and Drive context                                                                                                  | P01, P03                    | UI worker; directory/organization surfaces and approved client read model                                                | M             |
| P08 | Deliver B2 content-cycle workbench, item detail and explicit review/GHL handoff states                                                                                       | P01, P07                    | Workflow worker; content surfaces and lead-approved work-domain changes                                                  | L             |
| P09 | Make monthly generation and reminders replay-safe, with separate occurrences and recoverable partial failures                                                                | P08                         | Domain worker; recurrence/content commands and existing scheduler adapter. Lead owns migration and consistency decisions | M/L           |
| P10 | Deliver B3 role-first navigation and contextual first-use states                                                                                                             | P02, P06, P07, P08          | Shell worker; navigation, first-use and shell copy. No permission expansion                                              | M             |
| P11 | Deliver quick capture, triage and contextual search using existing record forms                                                                                              | P10                         | UI worker; exact capture/search components and page adapters                                                             | M             |
| P12 | Deliver template preview, assignment resolution and waiting-on handoffs                                                                                                      | P09, P11                    | Workflow worker; playbooks, project application UI and reviewed transition commands                                      | M/L           |
| P13 | Deliver actionable notifications, explicit snooze semantics and bounded unread handling                                                                                      | P05, P09, P12               | Workflow worker; notifications UI/domain/API and existing job integration                                                | M             |
| P14 | Finish C1 across changed lists and panels: saved state, sensible defaults, bulk feedback, keyboard/mobile behavior and localization                                          | P10, P11                    | UI worker; lead-reserved shared primitives/composites, then page adapters                                                | M             |
| P15 | Deliver C3 drill-down reports and client-readiness indicators using real data                                                                                                | P05, P07, P08               | UI worker; reports, client readiness and approved aggregate queries                                                      | M             |
| P16 | Deliver C2 measured improvements on the actual slow paths; remove obsolete components introduced by this work                                                                | P13, P14, P15               | Performance worker; only measured hot paths, with explicit shared-file reservation                                       | M/unknown     |
| P17 | Verify complete owner, manager, delivery, sales and consultant journeys; reconcile acceptance evidence and remaining defects                                                 | P12, P13, P14, P15, P16     | Reviewer; runtime checks and existing acceptance ledger. No concurrent product edits                                     | M             |
| P18 | Push and deploy each accepted release cohort, verify the live behavior, and close the execution record                                                                       | Cohort-specific gates below | Lead only; Git, tags, migrations, deploy and rollback                                                                    | S per release |

S means a bounded surface change. M means several connected surfaces or commands. L means a vertical workflow with contract or persistence work. These are relative estimates, not elapsed-hour promises. P00 must identify existing implementations and reduce scope where requirements already pass.

P04 blocks unexplained data mutation, not all product progress. If a record's provenance remains uncertain, preserve it and list it for review. P05 can still improve queue grouping and presentation without falsifying status. Missing GHL access blocks integration work only; link-based handoff remains shippable.

### Release cohorts

One approved program can produce several small releases. Do not wait for the last report or template to release attendance and trustworthy read errors.

| Release                 | Packages | User-visible result                                                        | Release condition                                                                            |
| ----------------------- | -------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| R1: Daily work          | P00-P06  | Simple attendance, truthful queues and usable calendar                     | Affected journeys pass; unresolved data classifications remain explicit                      |
| R2: Client delivery     | P07-P10  | Client overview and discoverable monthly content workflow                  | One complete future cycle works locally; recurrence/retry and role-scope gates pass          |
| R3: Less administration | P11-P15  | Faster capture, templates, handoffs, useful reminders and reports          | Cross-feature counts and transitions agree; no silent authorization or date changes          |
| R4: Completion          | P16-P17  | Measured performance, consistent interactions and full acceptance evidence | No open security/data-loss blocker or failed core journey; remaining exclusions are explicit |

P18 applies to every cohort. A package counts as released only after its commit reaches the target branch, the intended deployment serves traffic and the changed behavior is checked live. A skipped CI deployment does not count.

R1-R3 may omit a blocked optional package only when the lead records the narrower release scope and proves dependencies remain satisfied. They may not describe omitted work as done. R4 closes the agreed scope; it does not claim the product is permanently defect-free.

## Closed-loop agent operating contract

Use the existing agent guide, task skills and release tooling as the harness. The inspected checkout has no root `harness/` directory. Do not build an agent platform before implementing the product changes.

The roles below are provider-neutral. Honor the user's requested worker model and reasoning level when dispatching. The current preference is Luna high with the lead coordinating. Do not silently substitute Sol workers. If the requested model or visible-chat workflow is unavailable, report that dispatch limitation rather than misrepresenting the worker.

### Dispatch and ownership

The lead selects the next dependency-ready package and confirms exact file ownership. Use at most three workers alongside one lead. Fewer workers are preferable when packages share components or read models. Workers do not commit, push, migrate or deploy under the repository contract.

Each task brief must include:

```text
Package and outcome:
Base commit and required predecessors:
Exact owned files, including copy and tests:
Read-only shared contracts:
Reference file and pattern to adopt:
Required success/failure behavior:
Runtime checks and evidence destinations:
Explicit exclusions and escalation conditions:
Completion report destination:
```

The lead owns shared contracts, authorization, migrations, dependency changes and release operations. Workers propose changes to these areas without editing them until ownership transfers. A worker that needs another task's file reports the dependency once instead of creating a parallel implementation.

### Completion-driven coordination

Confirm that the selected host supports completion delivery before dispatch. Workers send one completion or blocked report containing their diff, checks, remaining risks and next dependency. The lead reviews that event and either accepts the package or returns one bounded repair task.

Do not repeatedly inspect chat lists, issue status requests or restart a worker because it is quiet. If the host cannot deliver completion to the lead, record the limitation before launching a closed-loop run. A stopped conversation cannot promise to wake itself without a supported continuation mechanism. Do not create recurring polling jobs to disguise that limitation.

On a credit or runtime interruption, preserve the diff and checkpoint the next safe action. Resume from the checkpoint after access returns. Inspect active ownership once at resumption before dispatching replacements; never launch two workers against the same unfinished files.

### Durable work record

At P00, create `docs/ux/agency-execution.md` as the single current execution ledger. Do not create it with fictional assignments or passing results. It records package status and links to evidence; the existing daily-work checklist still owns acceptance criteria.

Use these fields for each active package:

```text
ID | status | owner/chat | base commit | exact owned files
dependency state | next safe action | blocker and affected scope
local evidence | reviewed commit | pushed SHA | release tag
deployed version | live evidence | rollback reference
```

Allowed states are planned, ready, running, blocked, review, locally-accepted, pushed, deployed and live-accepted. Status changes require the corresponding evidence. A worker's final message alone cannot move a package to live-accepted.

Retain credentials in operator custody. Do not write passwords, session cookies, access links or raw client payloads into the ledger, screenshots or committed logs. Evidence should use local fixtures where possible and redact production identities that are unnecessary for verification.

### Bounded repair and harness learning

Classify a failure before changing code:

| Failure class                                 | Agent response                                                                                   | Retry boundary                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Transient tool or network failure             | Retry the same safe operation once after checking whether it already completed                   | Never replay a non-idempotent write without reconciliation                                    |
| Product defect                                | Reproduce on current code, repair the smallest responsible layer, then repeat the failed journey | Two materially different repair attempts per package, then lead review of scope or root cause |
| Contract or integration mismatch              | Freeze the affected files and resolve the contract with the lead                                 | Do not let multiple workers invent competing fixes                                            |
| Missing external access or product activation | Record the blocked integration and continue independent packages                                 | Do not bypass access controls or repeatedly ask the same question                             |
| Failed deployment or live regression          | Stop later releases, inspect evidence and use the documented compatible code rollback            | Never automatically restore D1 or replay a migration blindly                                  |

A fix commit triggers a review of how the defect escaped. Record the cause and update the narrowest relevant skill, component contract or acceptance gate when needed. A routine fix is not evidence that every task needs more tests. Add automated regression coverage for races, permissions, validation and lost side effects as required by the repository.

Do not suppress errors, weaken tests, disable authentication or delete production records to make a gate pass. After the repair limit, the lead can split scope or continue independent work. Escalate only the decision that genuinely needs the owner.

## Push and deployment contract

The [deployment runbook](../runbooks/deploy.md) and [rollback runbook](../runbooks/rollback.md) own release commands. This section defines the execution plan's release evidence. It is not evidence that a deployment has run.

Two source details require explicit checks:

- `.github/workflows/deploy.yml` runs on `v*` tags and can skip deployment when required secrets are absent. A green verification job alone proves neither deployment nor live acceptance.
- `scripts/deploy-tenants.ts` loads the tenant manifests and deploys the resulting set. Its parsed options do not include a tenant selector. P00 must confirm the exact target set before execution; never invent a `--tenant` flag.

For this program, the intended live product target is `crm.example.com`. If the release command would affect other tenants, the lead must establish an approved scoped path before release. Adding a manifest must not silently expand this program's deployment scope.

For each cohort, the lead must:

1. Freeze affected files and inspect the complete diff, including removed checks and changed defaults. Preserve unrelated user work and record any deferred conflicts.
2. Run changed workflow checks first and the existing required merge gates before release. Resolve baseline failures or explicitly escalate a gate-policy decision; never silently bypass them.
3. Generate any required migration centrally. Prefer additive changes that the previous Worker can still read. Verify local migration and read/write behavior before touching production.
4. Commit the reviewed files with verification evidence. Push to the intended remote branch and confirm its SHA. Never force-push to resolve an unexpected remote advance.
5. Resolve the next unused release tag and choose exactly one deployment owner: configured CI or the operator path. Do not race a local deployment with the tag workflow.
6. Confirm account, tenant set, secrets and existing deploy prerequisites without printing credentials. Run the documented dry-run preview and inspect the planned commands.
7. Capture the recovery bookmark, build and deploy the exact accepted source using the existing release workflow. A bookmark is not a license to restore data automatically.
8. Check the live health version and migration, then open the changed routes in a real browser. Verify expected content and behavior; an HTTP 200 may still contain an error boundary.
9. Record the commit, tag, Worker deployment identity, live URL and observed result. Publish a concise net-gain summary with any exclusions.

Production workflow writes during acceptance must be explicitly authorized and recoverable. Prefer local fixtures for full create/edit/failure tests and read-only production checks. Do not create fake staff attendance or send real client messages to prove a release.

Code rollback is permitted only when the previous version remains compatible with the current schema. Database restore, destructive reconciliation, paid-product activation, new third-party access, DNS changes and expanded permissions require the applicable owner approval. Ordinary implementation choices and non-destructive authorized releases do not need repeated confirmation.

After integration, remove only obsolete code introduced or superseded by the accepted work. Archive managed worktrees only after their needed changes and artifacts are recoverable and no worker owns them. Do not purge unrelated caches, local databases, assets or reference clones as generic hygiene.

## End-to-end acceptance journeys

P17 verifies journeys across modules rather than treating individual screens as completion. Use local fixture accounts for role mutations and write checks. Repeat the safe visible parts against the deployed cohort.

| Journey                         | Required result                                                                                                                                  | Evidence boundary                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Start and finish a workday      | Staff check in, find assigned work, complete an allowed task and check out. Both reported and server-received attendance times remain correct    | Persisted state after reload; duplicate-write behavior; no fake production attendance                            |
| Capture an unfinished request   | Save a rough idea, find it in triage, add project/owner/date later and retain it after a failed edit                                             | No unnecessary fields; input preserved; permissions applied at every step                                        |
| Run the monthly design cycle    | Preview the client cycle, assign designer/reviewer, meet the configured delivery date, request changes, approve the handoff and open GHL         | Distinct delivery and publication dates; replay-safe generation; evidence-backed approval attribution            |
| Work a sales lead               | Open an assigned lead, log a call, schedule a New York appointment or callback, reopen it in the personal calendar and progress the pipeline     | Unix instants; visible timezone; authenticated caller attribution; no duplicated event after retry               |
| Start delivery after a won deal | Open the resulting client/project, preview or inspect the playbook tasks and resolve unassigned work                                             | Existing conversion behavior preserved; no duplicate project after retry; internal agency work remains supported |
| Review the agency               | Owner/manager sees permitted team work, review bottlenecks and report drill-downs that match their counts                                        | No inference of productivity from attendance or capacity from counts                                             |
| Respect role boundaries         | Sales, delivery and consultant accounts can complete permitted jobs; direct URLs, search and APIs deny restricted data or mutations              | Distinct fixture accounts; read and write denials; personal scope does not erase legitimate project sharing      |
| Recover from failure            | Failed read shows retry; failed save preserves input; stale edit conflicts; panel closes and restores context; interrupted scheduling reconciles | Fresh requests and persisted state, not stale logs or screenshots alone                                          |
| Preserve tenant presentation    | Branding, terminology and English/Spanish copy remain configurable; phone and keyboard journeys stay usable                                      | No raw IDs, tenant strings or untranslated new controls in shared components                                     |

For the common paths, count steps before and after. Target one click for ordinary attendance and no more than two navigation actions to assigned work or a client brief. These are proposed usability targets. Exceptions that genuinely require more steps must name the reason.

Completion means every in-scope package has a live-accepted result or an owner-approved exclusion, every required journey passes, and the release evidence identifies the actual deployed code. Report package counts and named blockers rather than an unsupported overall percentage.

## Execution and acceptance

Implement A first, then B, then C. Attendance and a read-only data-provenance investigation can proceed independently. Client and content work can proceed together after agreeing on read models and navigation. Keep one owner for shared shell, table and panel changes to avoid conflicting component rewrites.

For each slice:

1. Record the user job, existing implementation, exact reference component and proposed visible change.
2. Implement the smallest complete interaction with existing components and server rules.
3. Exercise it in the running app with representative populated, empty and failed states. Check desktop, a 390 px phone viewport and keyboard use. Use reversible local fixtures for writes.
4. Add or adjust only the regression checks justified by the failure risk. Reuse `tests/e2e/customer/route-health.spec.ts` where appropriate. Avoid a new ad hoc script for every visual change; passing type checks is not visual acceptance.
5. On an authorized release, push the exact commit, deploy through the existing Wrangler workflow and verify the live version and changed interaction. “Local complete,” “pushed” and “deployed” are separate states.
6. Update the daily-work acceptance ledger with evidence. If a defect escapes, improve the relevant component contract or workflow gate; do not simply add another generic checklist.

Before starting, reconcile old parity claims with current evidence. Older completed reference checklists and the still-pending daily-work rows do not establish current end-to-end acceptance. Preserve historical release observations; record fresh results rather than rewrite history.

No defensible completion percentage or fixed-hour promise follows from this review. The first sizing checkpoint is A's data audit and an implemented attendance slice. The major remaining uncertainties are backlog provenance, current recurrence behavior, GHL synchronization scope and staff usability outside the owner session.

## Deliberate exclusions

Do not build a replacement publisher, copy Drive media into R2, introduce a new permissions engine, invent shift schedules, add a second task system, create microservices or rebuild the frontend framework. Do not hide genuine overdue work to make the dashboard look clean. The release succeeds when staff can complete ordinary work with fewer decisions while the underlying records remain accurate.
