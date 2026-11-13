# Automation rules

## Purpose

`@ops/module-automation` defines rule validation and matching without persistence or delivery code.

## Public API

`automationRulesSchema` validates workspace rules. `matchesConditions` and `planFor` select matching candidates; `runKey` identifies a rule, record and trigger occurrence. `src/index.ts` exports the associated types and supported trigger, condition and action constants.

## Ports

The module has no I/O ports. The app supplies candidates and executes actions through its automation runner.

## Invariants

- A workspace has at most 20 rules, each with up to five conditions and one to five actions.
- Every condition must match; a missing record fact never matches.
- Numeric range comparisons apply only to value conditions.

Run the module checks with `pnpm exec vitest run --project unit packages/modules/automation/test/rules.test.ts` from the repository root.
