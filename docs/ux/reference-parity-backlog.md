# Mirch CRM reference-parity backlog

This is the durable entry point for local reference-parity work. The atomic source of truth is the 50-row inventory in [Next-wave UX reference checklist](./next-wave-checklist.md#atomic-reference-parity-backlog), with the per-row browser status ledger directly below it. Rows are intentionally atomic: a green sub-flow never marks a whole product area complete.

## Operating rules

- Decisions are per behavior: `Copy` an exact, permissively licensed component when useful; `Replicate` observable product behavior independently; `Add` a missing Mirch capability; or `N/A` only with a product-scope rationale.
- P0 means a broken core interaction/security boundary; P1 means an incomplete existing user workflow; P2 means optional parity or polish.
- Each inventory row carries its source link, Mirch route/component, current state/gap, desired contract, exact browser path/evidence and local implementation/commit record. `Not checked` is not a pass.
- The backlog focuses on Mirch's current CRM, work, agency, settings and inbox model. It does not authorize copying an entire competitor product or implementing every feature in referenced products.
- Before direct code reuse, inspect the exact file/package license and record source commit/path and required notices. shadcn/ui is MIT ([source license](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)); Twenty's `packages/twenty-ui` is MIT ([package license](https://github.com/twentyhq/twenty/blob/main/packages/twenty-ui/LICENSE)), while the rest of the Twenty repo is primarily AGPL with marked Enterprise exceptions ([repo license](https://github.com/twentyhq/twenty/blob/main/LICENSE)); Frappe CRM is AGPL-3.0 ([repository](https://github.com/frappe/crm)). This pass copied no competitor source code. Twenty/Frappe application behavior is treated as reference to replicate unless the owner explicitly chooses a different license path.
- Browser-first local acceptance is required for implementation. Exercise desktop and 390px, safe create/edit/save/reload paths, keyboard/touch alternatives, console/error states, and restore fixtures. Do not deploy until the applicable P0/P1 rows have been accepted.

## Current priority queue

| Rank | Atomic rows                                              | Focus                                                                                                                                               | Evidence gate                                                                                                                           |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P0   | 06–08, 12, 21, 29, 31, 39, 41–42, 49                     | Core task/record overlays, save integrity, drag rollback, lead conversion and close lifecycle, real assignment/access boundaries, layout stability. | Existing real-browser paths are partial; each row's missing source/viewport/failure evidence must be closed before claiming acceptance. |
| P1   | 01–05, 09–10, 13–18, 20, 22–28, 30, 32–38, 40, 43–47, 50 | Navigation/search, lists/views, boards/calendar, CRM lifecycle, agency staffing, invites, settings/import and keyboard/mobile quality.              | Complete existing flows first; mark unsupported optional features N/A with rationale rather than building parity for its own sake.      |
| P2   | 11, 18, 19, 48                                           | Optional note/file widgets, saved views/bulk actions where not already supported, reporting depth.                                                  | Confirm current product model and user need before adding new surface area.                                                             |

Current work remains local and uncommitted. See the checklist's dated implementation/evidence snapshot for prior Calendar/auth/currency/task fixes, purpose-specific query reads, measured local document timings, invitation and staff-scope browser checks, and outstanding acceptance gaps. No Core Web Vitals trace is claimed because DevTools performance instrumentation was unavailable.
