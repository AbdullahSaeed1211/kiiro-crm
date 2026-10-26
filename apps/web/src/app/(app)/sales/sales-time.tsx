import { formatDate } from '../../../i18n/format'

export function ScheduleTime({
  at,
  timeZone,
  locale,
  overdue,
  overdueLabel,
}: Readonly<{ at: number; timeZone: string; locale: string; overdue: boolean; overdueLabel: string }>) {
  return (
    <time
      dateTime={new Date(at).toISOString()}
      className={overdue ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}
    >
      {formatDate(at, locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        timeZone,
      })}
      {overdue ? ` · ${overdueLabel}` : ''}
    </time>
  )
}

export function DueDate({ at, locale, now }: Readonly<{ at: number; locale: string; now: number }>) {
  const today = new Date(now)
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  return (
    <time
      dateTime={new Date(at).toISOString()}
      className={at < todayUtc ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}
    >
      {formatDate(at, locale, { dateStyle: 'medium', timeZone: 'UTC' })}
    </time>
  )
}
