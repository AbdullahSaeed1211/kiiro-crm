import { revalidatePath } from 'next/cache'

/** Task changes affect the daily queues and every task representation, including recurring schedule carriers. */
export function revalidateTaskViews(taskId?: string): void {
  for (const path of ['/', '/tasks', '/tasks/board', '/tasks/repeating', '/my-tasks', '/calendar', '/timeline']) {
    revalidatePath(path)
  }
  if (taskId !== undefined) revalidatePath(`/tasks/${taskId}`)
}
