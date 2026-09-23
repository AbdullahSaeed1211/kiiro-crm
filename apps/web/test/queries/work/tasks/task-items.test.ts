import { asId } from '@ops/kernel'
import type { TaskRecord } from '@ops/module-work'
import type { Workflow } from '@ops/platform'
import { describe, expect, it } from 'vitest'
import { toTaskListItem } from '../../../../src/server/queries/work/tasks/task-items'

const workflow: Workflow = {
  id: asId('wf'),
  recordType: 'task',
  name: 'Tasks',
  defaultStageId: asId('todo'),
  stages: [{ id: asId('todo'), name: 'To do', category: 'open', color: 'blue', position: 1 }],
}

const task: TaskRecord = {
  id: asId('t1'),
  title: 'Draft checklist',
  workflowId: asId('wf'),
  stageId: asId('todo'),
  stageEnteredAt: 1,
  updatedAt: 2,
  priority: 'high',
  assigneeIds: [asId('u1'), asId('hidden')],
  startAt: null,
  dueAt: 5,
  projectId: null,
  relatedType: null,
  relatedId: null,
}

describe('toTaskListItem', () => {
  it('uses the workflow stage and only the assignees the user can see', () => {
    const people = new Map([['u1', { name: 'Ada Example', email: 'ada@example.test' }]])
    expect(toTaskListItem(task, { workflow, people })).toEqual({
      id: 't1',
      title: 'Draft checklist',
      stage: { name: 'To do', color: 'blue', position: 1 },
      priority: 'high',
      assignees: [{ id: 'u1', name: 'Ada Example', email: 'ada@example.test' }],
      dueAt: 5,
      context: null,
    })
  })

  it('shows an unknown stage last when the stage is not in the workflow', () => {
    const item = toTaskListItem({ ...task, stageId: asId('gone') }, { workflow, people: new Map() })
    expect(item.stage).toEqual({ name: 'Unknown stage', color: 'gray', position: Number.MAX_SAFE_INTEGER })
  })
})
