# @ops/platform

## Purpose

Domain-agnostic building blocks: records, fields, workflows, activity, comments, attachments, notifications, views, permissions, templates, settings.

## Public API

- `can(actor, action, resource)`: the capability table of spec §9.10; inactive actors are denied everything.
- `isManagerUp(actor)`, `inScope(actor, resource)`: role and staff-scope predicates used by `can`.
- `createScopeFilter(definitions)`: returns a `ScopeFilter` that is unrestricted for owners and managers, an OR of owner (with transitive reports), assignee, group and extension branches for staff, and `MATCH_NOTHING` for inactive actors or record types without a `ScopeDefinition`.
- `changeStage(deps, input)`: spec §9.4. Loads the record, authorizes `update`, checks `expectedUpdatedAt`, returns the record unchanged for the same stage, then writes the stage conditionally, the `StageTransition` and the `stage.changed` activity in one `UnitOfWork`. Errors: `NOT_FOUND`, `FORBIDDEN`, `CONFLICT` (stale or concurrent update), `VALIDATION` (stage outside the workflow).
- Contract types: `RecordRef`, `StageTrackedRecord`, `Workflow`, `Stage`, `StageCategory`, `StageColor`, `StageTransition`, `ChangeStageInput`, `ChangeStageCommand`, `Actor`, `Role`, `Action`, `AccessResource`, `Can`, `ScopeFilter`, `ScopeDefinition`, `ScopeExtension`, `StageStore`, `UnitOfWork`, `MailSender`, `MailMessage`, `NotificationStore`, `NotificationInput`, `NotificationType`.
