'use server'

import { asId } from '@ops/kernel'
import { completeTask as completeTaskCommand } from '@ops/module-work'
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
  })
  .strict()

export interface CompleteTasksResult {
  readonly completed: number
  readonly skipped: number
}

// Only this action is exported: every export of a 'use server' file becomes callable from the client.
/** Marks the chosen tasks done; one that changed meanwhile, or that the user may not complete, is skipped. */
export async function completeTasks(input: unknown): Promise<CompleteTasksResult> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) return { completed: 0, skipped: 0 }
  const deps = await workCommandDeps()
  let completed = 0
  for (const task of parsed.data.tasks) {
    const result = await completeTaskCommand(deps, asId(task.id), task.updatedAt)
    if (result.ok) completed += 1
  }
  if (completed > 0) revalidatePath('/tasks')
  return { completed, skipped: parsed.data.tasks.length - completed }
}
