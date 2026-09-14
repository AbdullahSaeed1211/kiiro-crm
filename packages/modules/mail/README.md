# @ops/module-mail

## Purpose

Outbound and inbound email on records, templates, addressing.

## Public API

`createRecordAddressing` derives tenant-scoped record addresses, `resolveInboundDestination` routes local parts, `receiveInboundEmail` applies duplicate and sender quarantine rules, and `releaseQuarantined` keeps manager authorization at the persistence boundary. `renderTemplate` provides escaped HTML and text for all ten notification templates.

## Ports

- `RecordAddressing` resolves record thread tokens.
- `MailStore` owns message, CRM lookup, activity, notification, and release persistence.
- `MailSender` is the platform outbound transport.

## Invariants

- Record tokens are HMAC-SHA-256 values scoped by the tenant secret and truncated only after base32 encoding.
- Duplicate `messageId` values do not create a second message.
- Unknown destinations and senders that do not match a record or active user are quarantined.
- Notification bodies contain escaped values and always include both HTML and text.
