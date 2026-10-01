'use server'

import { rescheduleTask } from '../../../server/actions/work/tasks/rescheduleTask'

/** Carries a drop on the calendar to `rescheduleTask`; resolves to a message when the move failed. */
export async function moveTaskOnCalendar(move: {
  readonly id: string
  readonly token: string
  readonly from: string
  readonly to: string
}): Promise<string | undefined> {
  let dates: unknown
  try {
    dates = JSON.parse(move.token)
  } catch {
    return 'That move is not valid.'
  }
  const result = await rescheduleTask({ ...(dates as object), taskId: move.id, from: move.from, to: move.to })
  return result.ok ? undefined : result.error.message
}
