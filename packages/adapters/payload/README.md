# @ops/adapter-payload

## Purpose

Payload collections, repositories, access functions and hooks implementing platform and module ports.

## Public API

- `SPIKE_ACCESS[slug]`: `{ read, create, update, delete }` access functions of spec §11.1 for the spike collections; `SETTINGS_ACCESS` for the settings global; `canUseAdmin` for `access.admin` on users. In the spike, staff read activity, attachments and email messages only through server queries that authorize the parent record.
- Rules for building access: `allow(rule)`, `anyActive`, `managerUp`, `ownerOnly`, `scoped(recordType)`, `ownedBy(field)`, `systemOnly` (system writes use the Local API with `overrideAccess: true`), and `SPIKE_SCOPES`.
- `resolveActor(req)`: the request's `Actor`, with transitive reports (five levels) loaded once per request for staff; `toActor(user)`, `loadReportIds(req, managerId)`.
- Repositories on the Local API: `createTaskRepository(req)` and `createCrmRepository(req)` for user-scoped reads and compare-and-set writes, plus `createNotificationStore(payload)`, `createDueItemSource(payload)` and `createEmailMessageSink(payload)` for the Cloudflare adapter's cron and inbound ports. Compare-and-set updates use one conditional Drizzle statement after checking the request user's update access (E-017).
- `spikeCollections`, `settingsGlobal`, `ADMIN_GROUPS`: collection configs (pass `[...spikeCollections]` to Payload).
- `toWhere(filter)`, `withScope(where, scope)`: kernel `FilterNode` to Payload `Where`.
- `createUnitOfWork(req)`: runs work in a Payload transaction when the database adapter starts one, otherwise as ordered writes (D-36); `probeTransactions(payload)`.
- Names: `COLLECTIONS`, `SETTINGS_GLOBAL`, `RECORD_TYPES`, `FIELDS`, and `CRM_FIELDS`, which collections and repositories share:
  - users: `role` (select `owner | manager | staff`), `active` (checkbox, default true), `groups` (has-many relationship to groups), `reportsTo` (relationship to users);
  - organizations: `owner` (relationship to users), `source` (relationship to sources), and `customData`;
  - projects: `owner`, `members` (has-many relationship to users);
  - tasks: `assignees` (has-many relationship to users), `group` (relationship to groups), `project` (relationship to projects);
  - notifications: `user`; attachments: `uploadedBy`.

The CRM repository maps organization, contact, lead, and deal documents to the module contracts. It also lists sources and lost reasons, resolves default workflows, stores stage transitions and activity, and changes a deal's stage and `closedAt` in one conditional statement.
