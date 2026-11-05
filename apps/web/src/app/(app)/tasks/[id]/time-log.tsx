import { getProductContext } from '../../../../server/auth/context'
import { formatDuration } from '../../../../server/time/duration'
import { listTaskTime } from '../../../../server/time/entries'
import { TIME_LOG_COPY } from '../../../../i18n/time-log-copy'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { TimeLogForm } from './time-log-form'

const when = (time: number, locale: string): string =>
  new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(time)

/** The time logged on a task, with a form to add more; shown under the task's details. */
export async function TimeLog({ taskId }: Readonly<{ taskId: string }>) {
  const [entries, locale] = await Promise.all([listTaskTime(await getProductContext(), taskId), loadWorkspaceLocale()])
  const copy = TIME_LOG_COPY[locale]
  const total = entries.reduce((sum, entry) => sum + entry.minutes, 0)
  return (
    <section aria-label={copy.section} className="space-y-2 text-sm">
      <h3 className="font-medium">
        {copy.section}{' '}
        <span className="font-normal text-muted-foreground">{entries.length === 0 ? '' : formatDuration(total)}</span>
      </h3>
      <TimeLogForm
        taskId={taskId}
        today={new Date().toISOString().slice(0, 10)}
        entries={entries.map((entry) => ({
          ...entry,
          label: `${formatDuration(entry.minutes)} · ${entry.person} · ${when(entry.day, locale)}`,
        }))}
      />
    </section>
  )
}
