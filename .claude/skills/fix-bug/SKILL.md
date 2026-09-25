---
name: fix-bug
description: Use when fixing a reported or reproduced bug anywhere in the ops-platform codebase, from a domain command through to a UI page.
---

# Fix a bug

## Steps

1. Reproduce the bug against the running app before touching code (`verify-change` skill,
   sections 2 and 3): the curl call or page load that shows the wrong outcome. Write it down as
   a gate with the expected and the observed result. For a server action with no API endpoint
   yet, add the endpoint first (`add-api-endpoint`) when the use case belongs on the API, or
   reproduce in the browser.
2. Decide whether the bug needs a test. It does only when no response or type can show it:
   removed validation that still returns `ok`, a lost side effect, a permission or tenant-scope
   leak, or a race. Then write the failing test through the module's in-memory double
   (`packages/modules/crm/test/memory-crm.ts`, `packages/modules/work/test/memory-work.ts`) or,
   for cross-page flows, a Playwright test under `tests/`, and confirm it fails for the right
   reason. Otherwise the gate from step 1 is the proof.
3. Fix at the correct layer; don't patch a symptom in `apps/web` if the bug is a domain rule
   (see `add-use-case` for layer boundaries). Follow existing patterns in the surrounding file.
4. Re-run the gate (and the test, if any) and confirm the outcome changed for the right reason,
   not because an assertion or a check was weakened.
5. Commit as `fix(scope): <what and why>` with the gates under `Verified:` in the body; scope is
   the package or app touched (`fix(crm):`, `fix(web):`, `fix(adapter-payload):`).

## Rules / pitfalls

- A test earns its place only if a realistic product bug makes it fail. Never add a
  test that:
  - asserts a config literal (e.g. checking a constant equals itself),
  - greps/regexes source text instead of exercising behaviour,
  - covers dead code,
  - tests a script's own tooling (`scripts/check-*.ts`) rather than the product.
- Prefer the smallest existing test file over creating a new one; only create a new
  test file if the bug is in a module with no test coverage yet.
- E2E (`tests/`, Playwright) is for cross-page flows only; don't add an e2e test for
  something a unit test can cover. When you do write one, assert real geometry or
  behaviour (drag lands in the right column, redirect goes to the right URL); not
  just "heading is visible" or "element exists".
- Don't silently expand scope: fix the reported bug, not adjacent code you notice
  along the way (file a separate note/issue instead).

## Done when

- The gate from step 1 shows the wrong outcome before the fix and the right one after it
  (observe both, don't assume); the same holds for a test when step 2 required one.
- `pnpm typecheck && pnpm lint` pass.
- `pnpm verify:fast` passes (format, typecheck, lint, changed unit tests).
- No unrelated files changed.
