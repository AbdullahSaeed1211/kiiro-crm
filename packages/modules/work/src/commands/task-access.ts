import type { WorkTaskRecord } from '../ports/work'

/** Facts shared by policy checks for task reads, updates and workflow moves. */
export function taskResource(task: WorkTaskRecord) {
  return {
    type: 'task',
    assigneeIds: task.assigneeIds,
    parentId: task.projectId,
    relatedRecordType: task.relatedType,
    ownerOnly: task.ownerOnly,
    ...(task.groupId === null ? {} : { groupId: task.groupId }),
  }
}
