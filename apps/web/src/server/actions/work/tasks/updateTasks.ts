'use server'

import { asId } from '@ops/kernel'
import { updateTask as updateTaskCommand } from '@ops/module-work'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { workCommandDeps } from '@/server/container'

const MAX_TASKS = 100
const inputSchema = z
  .object({
    tasks: z
      .array(z.object({ id: z.string().min(1), updatedAt: z.number() }).strict())
      .min(1)
      .max(MAX_TASKS),
    change: z.union([
      z.object({ priority: z.enum(['none', 'low', 'medium', 'high', 'urgent']) }).strict(),
      z.object({ addAssignee: z.literal('me') }).strict(),
    ]),
  })
  .strict()

type Change = z.infer<typeof inputSchema>['change']

/** The task patch for a bulk change; `assignees` is the current assignees plus the signed-in user. */
const patchFor = (change: Change, assignees: readonly string[]) =>
  'priority' in change ? { priority: change.priority } : { assigneeIds: [...new Set(assignees)] }

export interface UpdateTasksResult {
  readonly updated: number
  readonly skipped: number
}

// Only this action is exported: every export of a 'use server' file becomes callable from the client.
/** Sets a priority on, or adds the signed-in user to, the chosen tasks; one that changed meanwhile or is not theirs to edit is skipped. */
export async function updateTasks(input: unknown): Promise<UpdateTasksResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return { updated: 0, skipped: 0 }
  const deps = await workCommandDeps()
  const { tasks, change } = parsed.data
  let updated = 0
  for (const task of tasks) {
    const current = await deps.repo.getTask(asId(task.id))
    if (current === undefined) continue
    const patch = patchFor(change, [...current.assigneeIds.map(String), String(deps.actor.id)])
    const result = await updateTaskCommand(deps, { taskId: task.id, expectedUpdatedAt: task.updatedAt, patch })
    if (result.ok) updated += 1
  }
  if (updated > 0) for (const path of ['/tasks', '/tasks/board', '/my-tasks', '/']) revalidatePath(path)
  return { updated, skipped: tasks.length - updated }
}
