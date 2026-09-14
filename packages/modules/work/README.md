# @ops/module-work

## Purpose

Work domain: projects, tasks, dependencies.

## Public API

The module exports project and task records, commands, the deterministic rank helpers, and `myTasksBuckets`.

## Ports

- `TaskRepository`: the existing platform `StageStore` plus `loadTaskWorkflow`, `listTasks` and `saveDates` (compare-and-set on `expectedUpdatedAt`).
- `WorkRepository`: project/task reads and writes used by the complete command surface, with compare-and-set updates and scoped stage storage.

## Invariants

- Task times are UTC epoch milliseconds (D-09).
- `saveDates` and `saveStage` write only while `updatedAt` still equals the expected value.
- Subtasks are limited to two levels and a parent cannot enter a completed stage while a child is open.
- Completing a task sets `completedAt`; reopening it clears the timestamp.
