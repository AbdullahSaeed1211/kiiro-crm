'use server'

import { completeTask } from './completeTask'
import { reopenTask } from './reopenTask'

export async function completeOrReopenTask(taskId: string, expectedUpdatedAt: number, reopen: boolean) {
  return (await (reopen ? reopenTask(taskId, expectedUpdatedAt) : completeTask(taskId, expectedUpdatedAt))).ok
}
