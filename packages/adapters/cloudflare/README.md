# @ops/adapter-cloudflare

## Purpose

Cloudflare adapters: Email Service, Turnstile, rate limits, R2 streams, cron and inbound email bridges.

## Public API

- `dispatchCron(env, scheduledTime)`: forwards a cron trigger to `POST /api/v1/internal/cron` through the `WORKER_SELF_REFERENCE` service binding with the internal secret (spec §13).
- `bridgeInboundEmail(env, message)`: reads the raw Email Routing stream once and forwards it with `x-envelope-from` and `x-envelope-to` to `POST /api/v1/internal/email/inbound`; rejects messages over `MAX_INBOUND_BYTES` (25 MiB) or refused by the route (spec §14.4).
- `INTERNAL_ROUTES`, `INTERNAL_SECRET_HEADER`: paths and header shared by the Worker entry and the internal route handlers.
- Types `InternalForwardEnv`, `InboundEmailMessage`, `RequestTarget`: the structural subset of Worker bindings and email messages these functions need, so the package does not depend on `@cloudflare/workers-types`.
