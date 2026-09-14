import type { Id } from '@ops/kernel'
import type { WorkTaskRecord } from '../ports/work'

export const MAX_SUBTASK_DEPTH = 2

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

export function hasOpenChildren(children: readonly WorkTaskRecord[]): boolean {
  return children.some((child) => child.completedAt === null && child.stageId !== '')
}
