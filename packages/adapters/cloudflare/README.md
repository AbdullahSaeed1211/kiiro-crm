# @ops/adapter-cloudflare

## Purpose

Cloudflare adapters: Email Service, Turnstile, rate limits, R2 streams, cron and inbound email bridges.

## Public API

- `dispatchCron(env, scheduledTime)`: forwards a cron trigger to `POST /api/v1/internal/cron` through the `WORKER_SELF_REFERENCE` service binding with the internal secret (spec §13).
- `bridgeInboundEmail(env, message)`: reads the raw Email Routing stream once and forwards it with `x-envelope-from` and `x-envelope-to` to `POST /api/v1/internal/email/inbound`; rejects messages over `MAX_INBOUND_BYTES` (25 MiB) or refused by the route (spec §14.4).
- `INTERNAL_ROUTES`, `INTERNAL_SECRET_HEADER`: paths and header shared by the Worker entry and the internal route handlers.
- `payloadEmailAdapter({ sender, fromAddress, fromName })`: Payload `email` adapter over a `MailSender` (spec §14.3); throws when the send fails.
- `handleCronRequest(request, { secret, jobs })`: `POST /api/v1/internal/cron`; constant-time secret check (401), body `{ scheduledTime }` (400), runs `runCron` and answers `{ ran }`.
- `handleInboundEmailRequest(request, { secret, sink })`: `POST /api/v1/internal/email/inbound`; secret (401), declared and actual size capped at 25 MiB (413), both envelope headers required (400), then `InboundEmailSink.accept`. `createLoggingInboundSink()` logs only size and SHA-256.
- `runCron({ scheduledTime, jobs, clock, logger })`: runs due `CronJob`s one after another over the 15-minute window (`CRON_INTERVAL_MS`) ending at the trigger; a failing job is logged and does not stop the others.
- `createDueSoonJob({ source, notifications, timeZone })`: `tasks.dueSoon` (spec §13); one `due_soon` notification per assignee for items due within 24 hours (`DUE_SOON_HORIZON_MS`), at most `DUE_SOON_LIMIT` (200) per run, deduplicated by record, local due date and user.
- `CloudflareMailSender(binding)`: `MailSender` over the `send_email` binding; `mapSendError` maps `E_RATE_LIMIT_EXCEEDED` to `RATE_LIMITED`, `E_VALIDATION_ERROR` and `E_SENDER_NOT_VERIFIED` to `VALIDATION` (`isSenderNotVerified` tells them apart, provider code in `details.providerCode`), everything else to `UNAVAILABLE`. `withPlatformSenderFallback(sender, { platformFrom })` retries once from the platform sender (spec §14.2). `ConsoleMailSender` logs recipient count and subject only.
- Types `CronJob`, `CronJobOutcome`, `CronWindow`, `CronRun`, `DueItem`, `DueItemSource`, `DueSoonDeps`, `InboundEmail`, `InboundEmailSink`, `SendEmailBinding`, `EmailServiceMessage`, `EmailServiceResult`, `SenderFallbackOptions`, `CronRequestDeps`, `InboundEmailRequestDeps`.
- Types `InternalForwardEnv`, `InboundEmailMessage`, `RequestTarget`: the structural subset of Worker bindings and email messages these functions need, so the package does not depend on `@cloudflare/workers-types`.
