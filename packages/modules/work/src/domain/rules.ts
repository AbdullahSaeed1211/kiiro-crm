import type { Id } from '@ops/kernel'
import type { StageCategory } from '@ops/platform'
import type { WorkTaskRecord } from '../ports/work'

export const MAX_SUBTASK_DEPTH = 2
export const TERMINAL_CATEGORIES: ReadonlySet<StageCategory> = new Set(['done_success', 'done_failure', 'cancelled'])

/** Counts a task's ancestors, stopping safely when a malformed cycle is encountered. */
export function subtaskDepth(task: WorkTaskRecord, byId: ReadonlyMap<Id, WorkTaskRecord>): number {
  let depth = 0
  let parentId = task.parentTaskId ?? null
  const seen = new Set<Id>()
  while (parentId !== null && !seen.has(parentId)) {
    seen.add(parentId)
    depth += 1
    parentId = byId.get(parentId)?.parentTaskId ?? null
  }
  return depth
}

/** Returns true when at least one child remains open. */
export function hasOpenChildren(children: readonly WorkTaskRecord[]): boolean {
  return children.some((child) => !TERMINAL_CATEGORIES.has(child.stageCategory))
}

/** Detects an ancestor cycle in an existing task hierarchy. */
export function hasAncestorCycle(task: WorkTaskRecord, byId: ReadonlyMap<Id, WorkTaskRecord>): boolean {
  let parentId = task.parentTaskId
  const seen = new Set<Id>()
  while (parentId !== null) {
    if (seen.has(parentId)) return true
    seen.add(parentId)
    parentId = byId.get(parentId)?.parentTaskId ?? null
  }
  return false
}
