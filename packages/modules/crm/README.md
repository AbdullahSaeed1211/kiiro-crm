# @ops/module-crm

## Purpose

CRM domain: organizations, contacts, leads, deals, conversion.

## Public API

Record types (`OrganizationRecord`, `ContactRecord`, `LeadRecord`, `DealRecord`, `LookupRecord`, `CrmRecords`, `CrmDrafts`, `CrmCustomData`), the ports below, and command runners prefixed with `run`.

Commands create and update all four record types, move leads and deals, mark records lost, and convert a lead into an organization, contact, and deal. Every command accepts `unknown`, validates it with its owned schema, and returns a typed `Result`.

Calling commands authorize US destinations, issue device sessions, assign numbers and record outcomes. `voiceSnapshot` exposes only readable call history and assigned numbers to staff. Number administration uses owner and manager permissions. The [calling contract](../../../docs/plans/us-calling.md) defines activation requirements and the difference between local simulation and carrier verification.

## Ports

- `CrmRepository`: typed `get`, `list`, `create` and compare-and-set `update` per record type, `findContactByEmail`, `loadDefaultWorkflow`, `listLookups`, plus platform `StageStore` for lead and deal stage moves.
- `CrmDeps`: actor, `can`, repository, unit of work, clock.
- `VoiceRepository`: request-scoped reads, atomic call reservations and answer claims, call legs, device generations, number operations and a leased event inbox.
- `VoiceProvider`: device credentials, sessions, US number orders, telephone call control and bounded recording downloads. Provider API credentials remain server-side.

## Invariants

- Times are UTC epoch milliseconds; money is integer minor units with a currency (D-09, D-10).
- Updates are compare-and-set on `updatedAt`; a stale version is a CONFLICT.
- Converted leads cannot change stage. A lost stage requires a lost reason. Moving a deal into or out of a terminal stage sets or clears `closedAt`.
- Lead conversion copies only custom fields whose lead and deal field definitions have the same key and type.
- A signed calling capability authorizes one reserved destination and caller ID. It expires, is bound to the saved device generation and can be consumed by only one browser leg. A retry resumes that leg.
- Workspace concurrency and one active call per person are enforced in persistence. Callback and booking outcomes require their respective Unix-millisecond date.
- Provider number quotes retain decimal USD strings; a missing price is unavailable, and an unconfirmed order stays pending.
