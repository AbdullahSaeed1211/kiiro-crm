import { getProductContext } from '../../../../server/auth/context'
import { formatDuration } from '../../../../server/time/duration'
import { listTaskTime } from '../../../../server/time/entries'
import { TimeLogForm } from './time-log-form'

const when = (time: number): string =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

/** The time logged on a task, with a form to add more; shown under the task's details. */
export async function TimeLog({ taskId }: Readonly<{ taskId: string }>) {
  const entries = await listTaskTime(await getProductContext(), taskId)
  const total = entries.reduce((sum, entry) => sum + entry.minutes, 0)
  return (
    <section aria-label="Time" className="space-y-2 px-4 pb-4 text-sm">
      <h3 className="font-medium">
        Time{' '}
        <span className="font-normal text-muted-foreground">{entries.length === 0 ? '' : formatDuration(total)}</span>
      </h3>
      <TimeLogForm
        taskId={taskId}
        today={new Date().toISOString().slice(0, 10)}
        entries={entries.map((entry) => ({
          ...entry,
          label: `${formatDuration(entry.minutes)} · ${entry.person} · ${when(entry.day)}`,
        }))}
      />
    </section>
  )
}
