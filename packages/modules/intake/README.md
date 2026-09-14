# @ops/module-intake

## Purpose

Public lead intake: forms, submissions, dedupe.

## Public API

`submitIntake` validates bounded payloads, enforces exact origins and Turnstile, hashes rate-limit and dedupe keys, and creates one lead per dedupe key. `IntakeForm`, `IntakeSubmission`, and the store, rate-limit, and Turnstile ports describe composition boundaries.

## Ports

- `IntakeStore` persists submissions and performs lead, comment, and notification writes.
- `IntakeRateLimiter` and `IntakeTurnstileVerifier` isolate platform services for local fixtures.

## Invariants

- Inactive forms are not discoverable through submission.
- Browser submissions require an exact allowlisted origin. Production submissions require Turnstile.
- Payloads are capped at 16 KB and need an email or phone.
- Rate-limit keys and dedupe keys contain hashes, not raw IP addresses or contact data.
- The unique dedupe key is checked before the lead write and must also be enforced atomically by the store.
