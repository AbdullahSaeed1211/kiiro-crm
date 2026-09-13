# M0 plan

Source: spec §21.3 M0. Written by the lead (the `harness:plan` script does not exist until M0-W3 merges).

| WP | Owner | Wave | Depends | Status | Objective | Write scope | Acceptance |
|---|---|---|---|---|---|---|---|
| M0-L1 | Lead | 0 | — | dispatched | Bootstrap: root configs, tooling, harness config/schemas/templates, docs skeleton, package skeletons, mail-router skeleton, apps/web scaffold | `package.json`; `pnpm-lock.yaml`; `pnpm-workspace.yaml`; `.npmrc`; `.nvmrc`; `.prettierrc.json`; `eslint.config.js`; `vitest.config.ts`; `playwright.config.ts`; `tooling/`; `harness/`; `docs/`; `packages/`; `apps/` | `pnpm install --frozen-lockfile` and `pnpm typecheck` succeed |
| M0-W1 | Worker | 1 | M0-L1 | planned | Check scripts: brand, vocab, disables, docs, size, scope, with tests and planted fixtures | `scripts/check-*.ts`; `scripts/test/checks/`; `scripts/fixtures/checks/` | `pnpm vitest run scripts/test/checks`; planted fixtures fail their checks |
| M0-W2 | Worker | 1 | M0-L1 | planned | CI workflow running install and `pnpm verify` | `.github/workflows/ci.yml` | workflow file valid; runs green once a remote exists (Q-004) |
| M0-W3 | Worker | 1 | M0-L1 | planned | Core harness scripts: plan, brief, record, retro, evals | `scripts/harness/`; `scripts/test/harness/` | `pnpm vitest run scripts/test/harness`; `pnpm harness:brief M0-W1` prints every brief field |
| M0-L2 | Lead | 2 | M0-W1, M0-W2, M0-W3 | planned | Integrate, planted-failure acceptance, harness self-test (§26.9), M0 report, first retro | `package.json`; `docs/reports/`; `harness/selftest/`; `harness/lessons/`; `harness/evals/` | spec §21.2 M0 row |

## Changes from spec table
- M0-L1 aligns `apps/web` dependencies to spec §4.1 now (planned for M1-L1) so the M0 install and typecheck acceptance can pass with strict peer dependencies.
- M0-W2 acceptance runs locally until a GitHub remote exists (Q-004).
