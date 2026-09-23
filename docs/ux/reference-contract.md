# UX Reference Contract

This contract is the acceptance boundary for the shared tenant workspace surfaces. It records behavior adopted from the local Twenty, Frappe CRM, Plane, Huly, and Agentic Inbox references without copying source code or branding.

| Surface             | Owner               | Adopted contract                                                                                                                                      | Explicit deviation                                                                                  |
| ------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Application shell   | Twenty              | In-flow sidebar, header utilities, inset main surface, contained overflow, consistent active rows                                                     | Tenant settings own branding, terminology, and module filtering                                     |
| Settings navigation | Twenty + Frappe CRM | Grouped, role-filtered navigation with the same row grammar as the primary shell; mobile remains a normal routed list                                 | No full-screen settings modal                                                                       |
| Command palette     | Plane               | Centered bounded dialog, useful default navigation/create groups, keyboard-selectable records, reset on close                                         | Remote search remains the product's per-record authorized API                                       |
| Task detail         | Twenty + Plane      | Task links open an intercepted contextual sheet while direct `/tasks/:id` remains the canonical full page; browser history represents the active task | Scroll containment and non-Calendar source routes still need browser evidence                       |
| Activity            | Plane + Huly        | Chronological event stream with comments read through the same parent scope                                                                           | Email is a dedicated record tab; reply delivery intentionally hands off to the tenant's mail client |
| Organizations       | Twenty + Frappe CRM | Compact, continuous directory grid with grouped controls; record opens on linked projects, contacts, and deals, with details in a secondary rail      | No organization image field, configurable field layout, or persistent directory view preset yet     |

## Organization source-to-component map

Paths in the Source column are relative to the `crm/references` checkout. These application files supplied interaction and layout evidence, not copied code.

| Source                                                                   | Observed pattern                                                                               | Mirch implementation                                                                                                 | Remaining gap                                                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `twenty/packages/twenty-front/src/modules/views/components/ViewBar.tsx`  | View controls share one bounded bar above a continuous object grid.                            | `directory-list-view.tsx`, `DataTable.tsx`, and `product.css` now group search and columns above the directory grid. | Saved view selection and persistent column order remain separate work.               |
| `frappe-crm/frontend/src/components/ListViews/OrganizationsListView.vue` | Organization identity leads each dense row with an avatar; row routing keeps view context.     | `directory-list-view.tsx` gives the name an identity mark and uses client-side links.                                | Mirch does not yet persist arbitrary column widths.                                  |
| `frappe-crm/frontend/src/pages/Organization.vue`                         | Related deals and contacts occupy primary record space instead of being buried under metadata. | `organization-record-view.tsx` opens on an Overview of projects, contacts, and deals; details remain secondary.      | Inline field editing and organization logos are not in Mirch's current record model. |

Twenty's application files and Frappe CRM are copyleft references. This pass reused no source code from either. Twenty's separately MIT-licensed `packages/twenty-ui` may be considered for exact component reuse only after recording the file, commit, and notice.

## State matrix

Every surface must be checked in empty, loading, populated, long-content, error, unauthorized, keyboard, and narrow/mobile states. Stateful navigation belongs in the URL (`tab`, `view`, `page`, `panel`, `returnTo`) rather than referrer or history-length inference.

## Current guards

- `tests/e2e/customer/route-health.spec.ts` checks route health, identifier leakage, light-mode default, contextual task close, and canonical task rendering.
- `pnpm lint`, `pnpm typecheck`, `pnpm check:brand`, `pnpm check:docs`, and `git diff --check` are required before a UI batch is complete.
- A route-health pass alone is insufficient evidence for visual completion; add state assertions and screenshots when a surface changes.
- Before another reference-driven UI pass, name the exact source component, the observed interaction, the Mirch component to change, and the expected before/after state. A generic product screenshot is not enough source evidence.

## Regression rule

If the same UX defect needs three corrective commits, add an automated guard in the relevant harness before continuing page-level work. Do not call a surface complete from a code-only review.
