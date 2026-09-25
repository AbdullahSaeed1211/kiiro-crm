---
name: ui-from-reference
description: Use when building a new UI surface and you want to look at a real reference implementation first (kanban, calendar, list-view toolbar, inline editing, task peek, conversion modal) before designing it from scratch.
---

# Build UI from a reference implementation

Shallow reference clones live at
`/Users/abdullahsaeed/freelance/mirchmedia-projects/crm/references/` (outside this
repo — never imported, committed, or linted here). Read
`references/README.md` for exact commits and the license/allowed-use table before
using any of them.

## License rule (per-directory, verify per-file — don't assume by repo name)

- **MIT/Apache-2.0 — may copy verbatim, keep the license notice**:
  - `references/payload` (MIT) — Payload/Next.js patterns.
  - `references/twenty/packages/twenty-ui` (MIT — has its own `LICENSE` and
    `package.json` `"license": "MIT"`) — icons, tokens, small presentational pieces.
  - `references/corteza` (Apache-2.0) — reuse with attribution and notice.
  - `references/agentic-inbox` (Apache-2.0), already vendored at
    `third_party/agentic-inbox/` with `LICENSE` and `NOTICE` files kept alongside the
    vendored code — follow that same convention (keep `LICENSE`+`NOTICE` next to any
    newly vendored Apache-2.0 code) if vendoring more of it. Inbox UI reuse only;
    exclude AI-agent features per the README's allowed-use column.
- **Behaviour reference only — re-implement, do not copy — until ADR-0003 says
  otherwise**:
  - `references/twenty` **outside** `packages/twenty-ui` — e.g.
    `packages/twenty-front` has no package-level license override and inherits the
    repo's AGPL-3.0 (per `references/README.md`). This includes `ViewBar.tsx`,
    `RecordIndexViewBar.tsx`, the `record-board` and `object-record/record-field`
    modules.
  - `references/plane` (AGPL-3.0), `references/frappe-crm` (AGPL-3.0).
  - `references/huly` (EPL-2.0).
  - `references/odoo` (LGPL-3.0/mixed) — process reference only.
  - Twenty files marked `@license Enterprise` (anywhere in the repo) — never use, not
    even as behaviour reference.

## Surface → reference map (verified paths)

- Task peek / properties panel → `references/plane/apps/web/core/components/issues/peek-overview/properties.tsx`
- List view toolbar/filter bar → `references/twenty/packages/twenty-front/src/modules/views/components/ViewBar.tsx` or `.../object-record/record-index/components/RecordIndexViewBar.tsx` (AGPL — behaviour only)
- Calendar header/day cell → `references/plane/apps/web/core/components/issues/issue-layouts/calendar/header.tsx` and `day-tile.tsx`
- Kanban column/card → `references/twenty/packages/twenty-front/src/modules/object-record/record-board/components/*` (AGPL — behaviour only)
- Lead/deal conversion modal → `references/frappe-crm/frontend/src/components/Modals/ConvertToDealModal.vue` (AGPL — behaviour only)
- Inline field editing → `references/twenty/packages/twenty-front/src/modules/object-record/record-field/` (AGPL — behaviour only)

## Steps

1. Open the mapped reference file(s) above and read for structure: what state it
   tracks, what triggers a save/commit, what the empty/loading/error states look
   like.
2. Check that file's directory (or the nearest `package.json`/`LICENSE`) against the
   table above — don't assume a whole reference repo is one license.
3. If MIT/Apache-2.0: port directly into `packages/ui/src/composites/` or the
   relevant app page, keep the license header/notice.
4. If AGPL/EPL/LGPL (the common case — most of these repos are AGPL): re-implement
   using this codebase's existing composites (`packages/ui/src/composites/DataTable`,
   `KanbanBoard`, `RecordPageLayout`, `StageSelect`, `ActivityFeed`) rather than
   translating the reference's component structure line-by-line. Match the
   *behaviour* (interaction, states, edge cases), not the code.
5. Route copy through `apps/web/src/i18n/` — never hard-code strings, a tenant name,
   colour, or domain. This product is white-label; branding comes from tenant
   settings, not from the reference app's branding.

## Rules / pitfalls

- Don't copy AGPL/EPL/LGPL code even "just to start from" and plan to rewrite later —
  re-implement from the start.
- Don't skip the per-file license check because the top-level README lists one
  license for the repo — `twenty` is mixed (MIT `twenty-ui`, AGPL everything else).
- Don't reuse Twenty files marked `@license Enterprise` under any circumstance.

## Done when

- Every reused/adapted reference file is cited (path + commit from
  `references/README.md`) in the PR description or commit message, with its license.
- No AGPL/EPL/LGPL source text was copied into this repo — only behaviour was
  reimplemented.
- No hard-coded tenant name, color, or domain was introduced.
- `pnpm lint && pnpm check:brand` pass.
