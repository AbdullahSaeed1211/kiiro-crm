# UX Conformance Matrix

This is the release-review inventory for customer-facing Mirch surfaces. The owner names identify the local reference whose observable behavior is the comparison baseline; Mirch-specific tenant, role, and data rules remain authoritative.

| Surface / routes | Reference owner | Required interaction contract | Evidence | Status / deviation |
| --- | --- | --- | --- | --- |
| App shell, dashboard `/` | Twenty | In-flow nav, active route, tenant branding, light default, responsive content | route-health + desktop/mobile screenshots | Conformant; tenant branding intentionally replaces reference brand |
| CRM indexes `/leads`, `/deals`, `/contacts`, `/organizations` | Twenty + Frappe CRM | Dense rows, real detail links, explicit empty/loading/error states, role-safe labels | route-health detail traversal + UUID guard | Conformant for current list read models |
| Boards `/leads/board`, `/deals/board`, `/tasks/board` | Plane | Predictable columns/cards, touch-safe actions, no dead card affordances | route-health + responsive project checks | Conformant; drag/drop remains intentionally unavailable |
| Projects `/projects`, `/projects/[id]` | Twenty | Object header, progress/context, linked work, explicit empty state | route-health + project interaction tests | Conformant |
| Tasks `/tasks`, `/my-tasks`, `/calendar`, `/tasks/[id]` | Twenty + Plane | URL-backed views/sort/page, contextual panel, canonical deep link, mobile drawer | desktop/mobile task guard + screenshots + back/forward | Conformant via explicit URL-state architecture; no intercepted parallel route |
| Settings `/settings/*` | Twenty + Frappe CRM | Grouped role-aware IA, consistent row grammar, routed forms | settings IA browser guard | Conformant; no full-screen modal settings |
| Command palette (all app routes) | Plane | Keyboard shortcut, centered bounded dialog, useful defaults, reset on close | command-palette browser guard | Conformant; search remains Mirch authorized API |
| Activity/comments on records | Plane + Huly | Chronology, actor/action language, comment composer, pending/error feedback | route-health + record activity implementation | Conformant for comments/activity; email thread renderer deferred |
| Email/intake `/settings/email`, `/settings/intake` | Agentic Inbox | Clear setup state, explicit send/intake boundaries, role-safe configuration | route-health + build | Setup/configuration surfaces conform; full thread UI is not yet surfaced |
| Auth/onboarding `/login`, `/invite/*`, `/onboarding` | Twenty + Frappe CRM | Prefilled deterministic seed, clear validation, no admin branding leakage | auth/provision tests + route-health | Conformant |

## Release evidence

- Desktop and 390px mobile Playwright runs cover route health, contextual/canonical tasks, browser Back/Forward, settings grouping, command defaults, and light-mode behavior.
- Task panel/page screenshots are generated under Playwright `test-results` for each run; they are intentionally not committed binary artifacts.
- `pnpm lint`, `pnpm typecheck`, `pnpm check:brand`, `pnpm check:docs`, `pnpm build`, and `git diff --check` are required gates.

## Known intentional deviations

- Explicit `panel=1`/`returnTo` URL state is used instead of Next intercepted routes; this preserves deep links and reloadability without introducing a second navigation tree.
- Saved views currently apply task sort and simple `status` filters; arbitrary per-column filter builders and rename/delete controls remain outside the current UI contract.
- Email setup and inbound intake are shipped; a complete Agentic Inbox-style thread composer/renderer is not yet part of the customer shell.

## Deeper reference learnings applied

- Plane's view list keeps the empty-search state separate from the no-views state and puts edit/delete/copy-link actions behind a close-on-select menu. Mirch now closes the saved-view menu after selection and distinguishes empty directory/filter states.
- Frappe's `ViewControls` treats mobile controls as a horizontally scrollable quick-filter rail, keeps refresh/sort/column actions explicit, and exposes Save Changes/Cancel only after a view is dirty. Mirch follows the same explicit-control rule and avoids rendering a filter affordance when a directory has no filter dimensions.
- Frappe's `Activities` component groups comments, tasks, calls, attachments, and email into a single chronological rail with actor avatars and a persistent connector. Mirch's shared `ActivityFeed` uses the same connector/actor hierarchy for the current activity contract.
- Twenty's record-table settings split filters, sorts, visible fields, hidden fields, and layout into separate focused sub-pages. Mirch records this as the next expansion path instead of combining unrelated controls into one opaque menu.
