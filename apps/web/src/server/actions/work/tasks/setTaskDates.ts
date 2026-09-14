'use server'

import { revalidatePath } from 'next/cache'
import { setTaskDates as setTaskDatesCommand } from '@ops/module-work'
import { asId } from '@ops/kernel'
import { getWorkCommandDeps } from '../../../work/command-deps'
import type { SetTaskDatesInput, SetTaskDatesResult } from '../../../work/set-task-dates'

/** Server Action: sets a task's start and due dates from the timeline (spec §17.9). */
export async function setTaskDates(input: SetTaskDatesInput): Promise<SetTaskDatesResult> {
  const result = await setTaskDatesCommand(await getWorkCommandDeps(), {
    taskId: asId(input.taskId),
    startAt: input.startAt,
    dueAt: input.dueAt,
    expectedUpdatedAt: input.expectedUpdatedAt,
  })
  if (result.ok) revalidatePath('/timeline')
  return result.ok
    ? {
        ok: true as const,
        data: { startAt: result.value.startAt, dueAt: result.value.dueAt, updatedAt: result.value.updatedAt },
      }
    : ({ ok: false as const, error: result.error } satisfies SetTaskDatesResult)
}
