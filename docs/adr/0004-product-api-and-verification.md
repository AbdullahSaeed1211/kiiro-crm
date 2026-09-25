# ADR-0004: Product API and verification

Status: accepted · Date: 2026-09-26

## Context

Server actions returned four different result shapes, and 16 of them sent raw exception messages to the browser. Validation lived in hand-written `if` chains that reported a single message without naming the failing field. The product use cases were reachable only through Next.js server actions, which cannot be called from a shell, so agents checked behavior by writing test files: of 89 test files, 33 had ever been touched by a `fix:` commit. A process harness around those tests cost more agent time than the product work it guarded.

## Decision

1. Every server action and every `/api/v1` route returns one shape, `ActionResult` from `apps/web/src/server/action-result.ts`: `{ ok: true, data }` or `{ ok: false, error: { code, message, fields? } }`. `/api/v1` responses use the HTTP status that spec §12.1 maps to the error code, and 401 without a session.
2. Input validation is declared once, as a zod schema in the owning module (`packages/modules/<module>/src/schema*`). The command parses with it, and a failure carries per-field messages (`fields`), built by `invalidInput` in `@ops/kernel`.
3. Each product use case is also exposed on `/api/v1`. One contract registry, `apps/web/src/server/api/contracts.ts`, supplies each route's body schema and the `GET /api/v1` index, which lists every endpoint with its JSON Schema. A route calls the same module command as the server action.
4. Unexpected exceptions are logged on the server by `actionFailure` and reach the browser only as generic copy with code `INTERNAL`. Payload's user-facing validation, forbidden and not-found errors pass through with their own codes.
5. Changes are verified against the running app with checks written as gates: a command, the expected output, and the observed output. A test is added only for a bug that neither a response nor a type can reveal: removed validation that still returns `ok`, a lost side effect, a permission or tenant-scope leak, or a race.

## Consequences

A developer or agent can learn the whole API with `curl /api/v1` and verify a change without writing code. A new endpoint is a registry entry and a thin route file; its validation cannot drift from the documentation because both read the same schema. The UI and the API share one error vocabulary, so a form can mark the failing field from `error.fields`.

The registry covers the work module (tasks and projects) today; CRM, settings and identity use cases still need entries, and settings and identity still call Payload directly (see [the code-health backlog](../backlog/code-health.md)). Fewer tests means regressions in behavior that only a sequence of screens exposes must be caught by the end-to-end suite or by gate checks during review.

## Alternatives considered

- A single envelope that always returns HTTP 200 and carries the status in the body: rejected, because curl, proxies and monitoring then cannot tell failures apart without parsing every body.
- A hand-written OpenAPI document: rejected, because it drifts from the code; the index is generated from the schemas the routes enforce.
- Validating in each route or server action: rejected, because the UI, the API and the module would each hold a copy of the rules.
- tRPC or GraphQL: rejected for now, because plain JSON over HTTP is what curl and other tenants' integrations can call without a client library.
- A unit test per validation rule and a harness that gates every change: rejected, because the tests re-stated the schema and the harness consumed most of the agent time without catching the product regressions that mattered.
