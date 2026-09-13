# @ops/adapter-payload

## Purpose

Payload collections, repositories, access functions and hooks implementing platform and module ports.

## Public API

- `SPIKE_ACCESS[slug]`: `{ read, create, update, delete }` access functions of spec §11.1 for the spike collections; `SETTINGS_ACCESS` for the settings global; `canUseAdmin` for `access.admin` on users. In the spike, staff read activity, attachments and email messages only through server queries that authorize the parent record.
- Rules for building access: `allow(rule)`, `anyActive`, `managerUp`, `ownerOnly`, `scoped(recordType)`, `ownedBy(field)`, `systemOnly` (system writes use the Local API with `overrideAccess: true`), and `SPIKE_SCOPES`.
- `resolveActor(req)`: the request's `Actor`, with transitive reports (five levels) loaded once per request for staff; `toActor(user)`, `loadReportIds(req, managerId)`.
- `toWhere(filter)`, `withScope(where, scope)`: kernel `FilterNode` to Payload `Where`.
- `createUnitOfWork(req)`: runs work in a Payload transaction when the database adapter starts one, otherwise as ordered writes (D-36); `probeTransactions(payload)`.
- Names: `COLLECTIONS`, `SETTINGS_GLOBAL`, `RECORD_TYPES`, and `FIELDS`, which collections must use because access functions query them:
  - users: `role` (select `owner | manager | staff`), `active` (checkbox, default true), `groups` (has-many relationship to groups), `reportsTo` (relationship to users);
  - organizations: `owner` (relationship to users);
  - projects: `owner`, `members` (has-many relationship to users);
  - tasks: `assignees` (has-many relationship to users), `group` (relationship to groups), `project` (relationship to projects);
  - notifications: `user`; attachments: `uploadedBy`.
