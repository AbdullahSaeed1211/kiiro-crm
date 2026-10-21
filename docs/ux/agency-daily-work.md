# Agency daily work

This is the acceptance checklist for the owner's fourteen requested improvements. Implementation alone does not close a row. The release lead records the behavior observed locally and on the deployed tenant before marking it accepted.

## Product decisions

Staff start with the next action, its client or internal project, its responsible person and its due date. Today summarizes attention queues. My tasks is the execution workspace. Reports hold comparisons and trends.

Capture requires only information needed to save a valid record. A person can write down a rough lead, task or content idea, then add details later. Drafts must not require a publication date, a budget or a completed brief. Requirements for a later stage are explained when someone attempts that transition.

The tenant is an agency workspace. Client organizations have projects, and projects have tasks and deliverables. The agency also has internal projects and its own sales pipeline. People can work across projects. Project responsibilities such as developer or PR remain distinct from access permissions.

Global navigation names work areas. Calendar, board, timeline and repeating are views of work. Project details keep related tasks, files and deliverables together. Lists show recognizable people and organizations rather than identifiers. Secondary controls remain discoverable without competing with the primary action.

## Acceptance checklist

### Sales staff workspace requirement

Sales staff need a personal calling workspace: assigned leads, call history, due callbacks, booked appointments and sales tasks. Their calendar must show their appointments, callbacks and dated tasks. Owners and authorized managers need the agency view with a person filter. Sales staff must not gain access to unrelated client delivery, billing, private tasks or workspace administration through this workspace. Access checks apply to direct URLs and APIs as well as navigation.

The implementation is under release verification. The permission roles are owner, manager and staff (`packages/platform/src/contracts/access.ts`). The public outbound form does not authenticate callers. A caller name entered in that form is attribution only and must not grant CRM access or establish record ownership. Signed-in call logging must record the authenticated actor. Acceptance requires two sales accounts with separate assignments, denied cross-account reads and writes, personal calendar checks, and an authorized agency overview.

The sales release has five acceptance boundaries. New account provisioning is deferred; existing invitation and login flows remain in use. The release lead must record local workflow results, the pushed commit and the observed production version before closing these boundaries.

| Boundary           | Acceptance evidence                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sales workspace    | Assigned leads, authenticated call history, callbacks, appointments and sales tasks are usable from one personal screen. Lists expose a route to records outside the initial bounded snapshot.                                                                                  |
| Unified calendar   | Personal and authorized agency views show tasks and sales events. A person can create, assign, edit and reload an appointment. Date-only task deadlines remain distinct from timezone-aware event times.                                                                        |
| Permissions        | Sales, delivery and consultant profiles restrict server reads and writes. Separate staff accounts cannot read or mutate each other's restricted records. Managers cannot read owner-only tasks or their attachments.                                                            |
| Workflow integrity | Intake creates its routed lead and schedule without duplicate callbacks. Interrupted writes have a retry path. Approval transitions, invalid owners, stale edits and incomplete content schedules are checked through the running API.                                          |
| Browser behavior   | The sales desk, Today and calendar render without error boundaries or script warnings. Task panels preserve their background and close correctly. Desktop and phone checks record actual layout and timing results; passing static checks alone does not establish performance. |

### Priority release observations, 2026-10-21

The local running app preserved an edited callback after reload, created an appointment, rejected a stale edit with a conflict, and rejected a delivery-profile assignee on a sales event. Public intake created one appointment; replay kept the same event and its completed status. Only version-marked submissions are eligible for repair, so historical submissions cannot create another lead through the recovery path.

Calendar days show two event chips and a More popover instead of nested scrollbars. Hover and keyboard focus expose the full title, date, time and timezone; task deadlines remain date-only. Reviewed captures cover 1280×900 and 390×844. Neither capture reported page errors or horizontal overflow. The existing Today, sales and calendar layout-shift checks passed below 0.1 on desktop and phone; these local observations are not production performance measurements.

The existing database integration suite passed eighteen cases, including a concurrent schedule-assignee update. Exactly one write wins, and its title and assignees remain paired. The D1 batch makes that schedule update atomic; it does not make lead and schedule updates a cross-record transaction. Production acceptance still requires the pushed release, successful migrations, deployment smoke checks and a live-page review.

Fresh local API checks confirmed manager edits to staff work profiles, denied manager role promotion and denied staff self-escalation. Sales excluded project delivery; delivery and consultant profiles excluded leads and deals. An unrelated staff task and unassigned sales events returned not found. Shared project membership still permits reading other assignees' tasks in that project; personal calendars narrow tasks to the signed-in person. Temporary profile changes were restored and read back.

### Daily work acceptance

All rows are pending final acceptance. Local source files and passing checks are evidence of implementation, not evidence of deployment.

| Item                    | Required outcome                                                                                 | Evidence needed to accept                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Today                | Overdue work, leads needing follow-up and work due this week, each with context and one action   | Owner and staff see their permitted queues; totals and drill-down filters agree; opening and closing an item preserves context                    |
| 2. Simpler lists        | Deals, projects and contacts identify the subject first and hide low-value columns by default    | Populated and empty desktop/phone lists; hidden fields remain accessible; sorting and pagination preserve filters                                 |
| 3. Lead controls        | Views, save view, import and export share a More menu                                            | Each action works; permissions hide unavailable actions; a saved view can be reopened                                                             |
| 4. Settings             | Common settings are obvious; advanced settings are discoverable                                  | Owner, manager and staff navigation; active page remains identifiable; keyboard and phone navigation work                                         |
| 5. First run            | An empty workspace offers a relevant first action                                                | Fresh account sees add lead/task; an established workspace with completed work does not appear new                                                |
| 6. Overdue alerts       | Due-today work stays out of overdue; missed scheduler windows recover; unread alerts can be read | Cron behavior and daily deduplication; API timestamp representation; unread badge, row styling, read action and failure state                     |
| 7. Repeating            | One current schedule per series, cadence, responsible people and next scheduled day              | Create repeating work, complete it, inspect successor and reload; historical unfinished occurrences remain accessible                             |
| 8. Calls                | Lead/contact history records caller, time, outcome and optional notes                            | Save and reload from both record types; unauthorized parent access is denied                                                                      |
| 9. Approvals            | Project deliverables move through sent to client, approved and changes requested                 | Legal transitions persist; actor/time recorded; concurrent edits conflict; staff recording a response is not represented as client authentication |
| 10. Content             | Draft posts/campaigns can be captured before scheduling and viewed by publication date           | Create rough draft, enrich, schedule, edit and reload; calendar distinguishes content from tasks                                                  |
| 11. Charts              | Lead sources, work per person and retainer condition answer specific management questions        | Date ranges and labels match underlying records; comparisons expose their units; missing budget/capacity data stays explicit                      |
| 12. Language            | Lead/deal/project filters and settings use workspace-language catalogs                           | English and Spanish checks, including labels, validation, empty and error states                                                                  |
| 13. Interaction defects | Task close returns phone focus; timeline switches without the reported key warning               | Reproduce and retest affected mobile browser; do not hide an unexplained warning                                                                  |
| 14. Layout guards       | Existing browser checks catch overlap, overflow and broken contextual panels                     | Desktop and 390px geometry and cross-page behavior checks, with screenshots reviewed by the release lead                                          |

## Decision rules

Every additional field, menu or screen needs an agency task it makes easier. The lead asks whether it avoids repeated entry, makes ownership clear or removes an unnecessary choice. A competitor feature is evidence to study, not sufficient reason to build it.

Use lists for actions, bars for category comparisons and lines for trends. Use images for actual creative work or recognizable identity. Decorative images do not occupy daily-work space. Every metric names its date range and units and opens the relevant records when a drill-down is offered.

Task counts do not establish capacity. Invoice totals do not establish profit. A new lead does not prove an unanswered message. Empty, unavailable and failed reads are different states and must have different feedback.

The release gate includes the existing static/build checks, scoped persistence checks and observed browser workflows. Passing a route-heading test does not prove usability. Reference-derived behavior must also work with long names, missing optional values, keyboard input and narrow screens.

## Reference grounding

The following primary product documentation was consulted on 2026-10-20. These are sourced design patterns; Mirch's decisions and acceptance criteria above are recommendations for this agency, not vendor claims.

| Source                                                                                                              | Pattern informing this work                                                              |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Teamwork Home](https://support.teamwork.com/projects/getting-started/use-home-in-teamwork)                         | Separate overview from My work; keep actionable detail in context                        |
| [Productive default dashboards](https://help.productive.io/en/articles/12750529-default-dashboards-for-new-users)   | Separate delivery, utilization, sales and finance views; permission-aware summaries      |
| [Scoro dashboard setup](https://support.scoro.com/hc/en-us/articles/12379977388173-Dashboard-setup)                 | Lists, numeric metrics and comparisons serve different questions; benchmarks add meaning |
| [Float capacity planning](https://support.float.com/en/articles/13847946-capacity-planning-and-resource-scheduling) | Availability and allocations are needed to establish capacity                            |
| [Harvest time reports](https://support.getharvest.com/hc/en-us/articles/360048181692-Time-report)                   | Drill down through clients, projects, tasks and people                                   |
| [Bonsai projects](https://help.hellobonsai.com/en/articles/12783206-all-about-projects)                             | Keep project work, communication, documents and team context together                    |
| [NN/g information architecture](https://www.nngroup.com/articles/ia-vs-navigation/)                                 | Define relationships and terminology before navigation                                   |
| [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/)                             | Prioritize frequent actions and expose advanced options with clear labels                |

The source-level component and license rules remain in [the reference contract](reference-contract.md) and [the agent guide](../../AGENTS.md#references-and-licences). This document copies no competitor source.
