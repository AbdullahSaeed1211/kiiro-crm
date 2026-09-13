# @ops/module-crm

## Purpose

CRM domain: organizations, contacts, leads, deals, conversion.

## Public API

Record types (`OrganizationRecord`, `ContactRecord`, `LeadRecord`, `DealRecord`, `LookupRecord`, `CrmRecords`, `CrmDrafts`, `CrmCustomData`), the ports below, and command runners prefixed with `run`.

Commands create and update all four record types, move leads and deals, mark records lost, and convert a lead into an organization, contact, and deal. Every command accepts `unknown`, validates it with its owned schema, and returns a typed `Result`.

## Ports

- `CrmRepository`: typed `get`, `list`, `create` and compare-and-set `update` per record type, `findContactByEmail`, `loadDefaultWorkflow`, `listLookups`, plus platform `StageStore` for lead and deal stage moves.
- `CrmDeps`: actor, `can`, repository, unit of work, clock.

## Invariants

- Times are UTC epoch milliseconds; money is integer minor units with a currency (D-09, D-10).
- Updates are compare-and-set on `updatedAt`; a stale version is a CONFLICT.
- Converted leads cannot change stage. A lost stage requires a lost reason. Moving a deal into or out of a terminal stage sets or clears `closedAt`.
- Lead conversion copies only custom fields whose lead and deal field definitions have the same key and type.
