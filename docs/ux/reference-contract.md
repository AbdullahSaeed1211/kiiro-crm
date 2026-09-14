# UX Reference Contract

This contract is the acceptance boundary for the shared tenant workspace surfaces. It records behavior adopted from the local Twenty, Frappe CRM, Plane, Huly, and Agentic Inbox references without copying source code or branding.

| Surface             | Owner               | Adopted contract                                                                                                      | Explicit deviation                                                                                  |
| ------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Application shell   | Twenty              | In-flow sidebar, header utilities, inset main surface, contained overflow, consistent active rows                     | Tenant settings own branding, terminology, and module filtering                                     |
| Settings navigation | Twenty + Frappe CRM | Grouped, role-filtered navigation with the same row grammar as the primary shell; mobile remains a normal routed list | No full-screen settings modal                                                                       |
| Command palette     | Plane               | Centered bounded dialog, useful default navigation/create groups, keyboard-selectable records, reset on close         | Remote search remains the product's per-record authorized API                                       |
| Task detail         | Twenty + Plane      | `panel=1` is contextual and returns through explicit `returnTo`; direct `/tasks/:id` is canonical full page           | No intercepted Next parallel route yet; explicit URL contract is the compatibility layer            |
| Activity            | Plane + Huly        | Chronological event stream with comments read through the same parent scope                                           | Email is a dedicated record tab; reply delivery intentionally hands off to the tenant's mail client |

## State matrix

Every surface must be checked in empty, loading, populated, long-content, error, unauthorized, keyboard, and narrow/mobile states. Stateful navigation belongs in the URL (`tab`, `view`, `page`, `panel`, `returnTo`) rather than referrer or history-length inference.

## Current guards

- `tests/e2e/customer/route-health.spec.ts` checks route health, identifier leakage, light-mode default, contextual task close, and canonical task rendering.
- `pnpm lint`, `pnpm typecheck`, `pnpm check:brand`, `pnpm check:docs`, and `git diff --check` are required before a UI batch is complete.
- A route-health pass alone is insufficient evidence for visual completion; add state assertions and screenshots when a surface changes.

## Regression rule

If the same UX defect needs three corrective commits, add an automated guard in the relevant harness before continuing page-level work. Do not call a surface complete from a code-only review.
