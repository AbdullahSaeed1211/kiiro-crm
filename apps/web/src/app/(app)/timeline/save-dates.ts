import type { GanttDatesChange } from '@ops/ui/composites/GanttView'
import { setTaskDates } from '../../../server/actions/work/tasks/setTaskDates'

/** A dated task as the timeline page hands it to the chart. */
export interface TimelineTask {
  readonly id: string
  readonly title: string
  readonly startAt: number | null
  readonly dueAt: number | null
  readonly updatedAt: number
}

/** Hooks the saver uses to track task versions and react to conflicts. */
export interface DatesSaverOptions {
  readonly versionOf: (taskId: string) => number
  readonly onSaved: (taskId: string, updatedAt: number) => void
  readonly onConflict: () => void
}

/** Builds the chart's `onDatesChange`, sending the task version the page last saw. */
export function createDatesSaver(options: DatesSaverOptions): GanttDatesChange {
  return async (taskId, startAt, dueAt) => {
    const result = await setTaskDates({ taskId, startAt, dueAt, expectedUpdatedAt: options.versionOf(taskId) })
    if (result.ok) options.onSaved(taskId, result.data.updatedAt)
    else if (result.error.code === 'CONFLICT') options.onConflict()
    return result
  }
}
