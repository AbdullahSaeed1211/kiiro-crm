'use server'

import { revalidatePath } from 'next/cache'
import { getWorkDeps } from '../../../work/deps'
import { runSetTaskDates, type SetTaskDatesInput, type SetTaskDatesResult } from '../../../work/set-task-dates'

/** Server Action: sets a task's start and due dates from the timeline (spec §17.9). */
export async function setTaskDates(input: SetTaskDatesInput): Promise<SetTaskDatesResult> {
  const result = await runSetTaskDates(await getWorkDeps(), input)
  if (result.ok) revalidatePath('/timeline')
  return result
}
