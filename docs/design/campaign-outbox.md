# Campaign outbox and messaging ports

Status: proposal. Nothing here is built.

## Why

The newsletter sends from one request: it loops over up to 500 subscribers and calls the mail provider for each. That has three limits. A Worker request can time out or hit its subrequest cap part-way through a send. A failed message is counted but never retried. And there is no way to pause, cancel or schedule a campaign, or to keep from mailing someone at night.

The FastTrack platform (a sibling project, `Communications Phase 1.5`) already solved these for SMS and email. This document keeps the parts that fit this codebase and drops the parts that depend on its stack (Laravel, MongoDB, Railway workers).

## What to borrow

| Idea from FastTrack                                                                                    | Use here                                                                                                      |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| A provider port with three implementations: real, disabled and a deterministic fake                    | A `MessagingPort` in the mail module. Tests and local development use the fake.                               |
| A durable outbox: one delivery row per recipient, unique on (campaign, recipient)                      | A `deliveries` table; a repeated send cannot mail anyone twice.                                               |
| Bounded batches, a per-minute rate cap, and retry delays of 60 s, 300 s, then 1800 s                   | A cron job that claims a small batch each minute.                                                             |
| Campaign states: draft, scheduled, running, paused, completed, cancelled                               | A `campaigns` table with the same states, so a send can be paused or cancelled.                               |
| Quiet hours evaluated in the campaign's time zone                                                      | The tenant time zone already exists in settings.                                                              |
| A suppression list stored as one-way hashes                                                            | Unsubscribes already clear the contact's opt-in; hashes matter once other channels exist.                     |
| Immutable audience segments with a preview                                                             | Newsletter audiences are named lists today; a saved rule (for example "opted in, in Clients") can come later. |
| A two-stage rollout: build and rehearse with the fake provider, then a written approval for live sends | Same for SMS. No live SMS send without an explicit approval step.                                             |

## Proposed shape

- `campaigns`: id, channel (`email` or `sms`), subject and body, audience, state, created by, scheduled time, counts.
- `deliveries`: campaign, contact, address, state (`pending`, `sent`, `failed`, `suppressed`), attempts, next attempt time, provider message id. Unique on (campaign, contact).
- Sending a campaign writes its deliveries in one transaction and returns. A scheduled job, running each minute, claims up to a batch of due deliveries, sends them through the port, and records the outcome. A crash leaves rows `pending` and the next run resumes them.
- The newsletter page then shows progress (sent, failed, waiting) instead of a single count, and the campaign list becomes the campaign table.

## SMS through RingCentral

RingCentral publishes MIT-licensed SDKs (`@ringcentral/sdk`) and an embeddable phone widget. SMS would be a second implementation of the same port. It needs a sender number, consent tracking per contact (SMS consent is separate from email), and an approval step before the first live send. FastTrack keeps live RingCentral sends off until that approval, and this project should too.

## Order of work

1. Add the port with a fake and a disabled implementation, and move the newsletter behind it.
2. Add `campaigns` and `deliveries` with the cron sender; keep the current page working on top of them.
3. Add pause, cancel and quiet hours.
4. Add SMS only after a decision on the sender number and consent.
