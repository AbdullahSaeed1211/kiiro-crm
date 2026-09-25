---
name: fix-bug
description: Use when fixing a reported or reproduced bug anywhere in the ops-platform codebase, from a domain command through to a UI page.
---

# Fix a bug

## Steps

1. Reproduce the bug as a failing behavioural test in the nearest existing test file
   for the affected code — don't create a new test file if a suitable one exists.
   - Domain/command bugs: `packages/modules/<module>/test/**` (e.g. pattern in
     `packages/modules/crm/test/memory-crm.ts`).
   - Workflow/permission bugs: `packages/platform/test/workflows/change-stage.test.ts`
     or `packages/platform/test/permissions/**`.
   - Server action / page-model bugs: `apps/web/test/**` (e.g. `apps/web/test/deals.test.ts`
     imports the view-model functions under test directly, builds minimal fixtures
     inline, and asserts on the computed result — follow that shape).
   - Cross-page flow bugs: an e2e test under `tests/` (Playwright), only if the bug
     genuinely spans multiple pages/navigations.
2. Confirm the test fails for the right reason (run it in isolation) before touching
   the fix.
3. Fix at the correct layer — don't patch a symptom in `apps/web` if the bug is a
   domain rule (see `add-use-case` skill for layer boundaries). Follow existing
   patterns in the surrounding file.
4. Confirm the test now passes, and that you haven't only made the test pass by
   weakening the assertion.
5. Commit as `fix(scope): <what and why>`, scope being the package/app touched (e.g.
   `fix(crm):`, `fix(web):`, `fix(work):`).

## Rules / pitfalls

- A test earns its place only if a realistic product bug makes it fail. Never add a
  test that:
  - asserts a config literal (e.g. checking a constant equals itself),
  - greps/regexes source text instead of exercising behaviour,
  - covers dead code,
  - tests a script's own tooling (`scripts/check-*.ts`) rather than the product.
- Prefer the smallest existing test file over creating a new one; only create a new
  test file if the bug is in a module with no test coverage yet.
- E2E (`tests/`, Playwright) is for cross-page flows only — don't add an e2e test for
  something a unit test can cover. When you do write one, assert real geometry or
  behaviour (drag lands in the right column, redirect goes to the right URL) — not
  just "heading is visible" or "element exists".
- Don't silently expand scope: fix the reported bug, not adjacent code you notice
  along the way (file a separate note/issue instead).

## Done when

- The new/edited test fails on the pre-fix code and passes on the post-fix code
  (verify both, don't assume).
- `pnpm typecheck && pnpm lint` pass.
- `pnpm verify:fast` passes (format, typecheck, lint, changed unit tests).
- No unrelated files changed.
