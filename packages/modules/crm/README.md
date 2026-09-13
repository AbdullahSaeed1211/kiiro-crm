# @ops/module-crm

## Purpose

CRM domain: organizations, contacts, leads, deals, conversion.

## Public API

Record types (`OrganizationRecord`, `ContactRecord`, `LeadRecord`, `DealRecord`, `LookupRecord`, `CrmRecords`, `CrmDrafts`) and the ports below. Commands arrive in M2-W1.

## Ports

- `CrmRepository`: typed `get`, `list`, `create` and compare-and-set `update` per record type, `findContactByEmail`, `loadDefaultWorkflow`, `listLookups`, plus platform `StageStore` for lead and deal stage moves.
- `CrmDeps`: actor, `can`, repository, unit of work, clock.

## Invariants

- Times are UTC epoch milliseconds; money is integer minor units with a currency (D-09, D-10).
- Updates are compare-and-set on `updatedAt`; a stale version is a CONFLICT.
