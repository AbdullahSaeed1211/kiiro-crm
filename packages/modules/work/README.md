# @ops/module-work

## Purpose

Work domain: projects, tasks, dependencies.

## Public API

Types only in the spike: `TaskRecord`, `TaskPriority`, `TaskDatesInput`, `TaskRepository`.

## Ports

- `TaskRepository`: platform `StageStore` plus `loadTaskWorkflow`, `listTasks` and `saveDates` (compare-and-set on `expectedUpdatedAt`).

## Invariants

- Task times are UTC epoch milliseconds (D-09).
- `saveDates` and `saveStage` write only while `updatedAt` still equals the expected value.
