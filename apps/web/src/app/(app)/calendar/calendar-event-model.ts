import type { CalendarEvent } from '@ops/ui/composites/CalendarMonth'
import { formatDateKey } from '@ops/ui/lib/dates'
import { formatDate } from '../../../i18n/format'
import type { Locale } from '../../../i18n/config'
import { taskHref } from '../task-navigation'

type CalendarTask = Readonly<{
  id: string
  title: string
  priority: string
  dueAt: number | null
  startAt: number | null
  updatedAt: number
  stageCategory: string
}>

type CalendarScheduleItem = Readonly<{
  id: string
  kind: 'appointment' | 'callback'
  startsAt: number
  title: string | null
  parentTitle: string | null
}>

type CalendarEventCopy = Readonly<{
  callback: string
  appointment: string
  lead: string
  dueDate: string
}>

function scheduleSubject(item: CalendarScheduleItem, fallback: string): Readonly<{ title: string; tooltip: string }> {
  const title = item.title ?? item.parentTitle ?? fallback
  const tooltip =
    item.title !== null && item.parentTitle !== null && item.title !== item.parentTitle
      ? `${item.title} · ${item.parentTitle}`
      : title
  return { title, tooltip }
}

function scheduleTimeLabel(item: CalendarScheduleItem, locale: Locale, timeZone: string): string {
  return formatDate(item.startsAt, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  })
}

function taskColor(priority: string): CalendarEvent['color'] {
  if (priority === 'urgent') return 'red'
  if (priority === 'high') return 'amber'
  return 'blue'
}

function inMonth(date: string, year: number, month: number): boolean {
  const prefix = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-`
  return date.startsWith(prefix)
}

function taskEvents({
  tasks,
  returnTo,
  year,
  month,
  locale,
  dueDateLabel,
}: Readonly<{
  tasks: readonly CalendarTask[]
  returnTo: string
  year: number
  month: number
  locale: Locale
  dueDateLabel: string
}>): CalendarEvent[] {
  return tasks.flatMap((task) => {
    if (task.dueAt === null || ['done_success', 'done_failure', 'cancelled'].includes(task.stageCategory)) return []
    const date = formatDateKey(task.dueAt, 'UTC')
    if (!inMonth(date, year, month)) return []
    return [
      {
        id: task.id,
        title: task.title,
        tooltip: `${task.title} · ${dueDateLabel}: ${formatDate(task.dueAt, locale, { dateStyle: 'long', timeZone: 'UTC' })}`,
        date,
        href: taskHref(task.id, returnTo),
        color: taskColor(task.priority),
        moveToken: JSON.stringify({ dueAt: task.dueAt, startAt: task.startAt, updatedAt: task.updatedAt }),
      },
    ]
  })
}

function scheduleEvent({
  item,
  year,
  month,
  timeZone,
  locale,
  copy,
  carriedQuery,
}: Readonly<{
  item: CalendarScheduleItem
  year: number
  month: number
  timeZone: string
  locale: Locale
  copy: CalendarEventCopy
  carriedQuery: string
}>): CalendarEvent {
  const params = new URLSearchParams(carriedQuery)
  params.set('year', String(year))
  params.set('month', String(month + 1))
  params.set('event', item.id)
  const kindLabel = item.kind === 'callback' ? copy.callback : copy.appointment
  const timeLabel = scheduleTimeLabel(item, locale, timeZone)
  const subject = scheduleSubject(item, copy.lead)
  return {
    id: `schedule-${item.id}`,
    title: `${kindLabel} · ${timeLabel} · ${subject.title}`,
    tooltip: `${kindLabel} · ${timeLabel} · ${subject.tooltip}`,
    date: formatDateKey(item.startsAt, timeZone),
    href: `/calendar?${params.toString()}`,
    color: item.kind === 'callback' ? 'amber' : 'green',
  }
}

function scheduleEvents({
  items,
  year,
  month,
  timeZone,
  locale,
  copy,
  carriedQuery,
}: Readonly<{
  items: readonly CalendarScheduleItem[]
  year: number
  month: number
  timeZone: string
  locale: Locale
  copy: CalendarEventCopy
  carriedQuery: string
}>): CalendarEvent[] {
  return items
    .map((item) => scheduleEvent({ item, year, month, timeZone, locale, copy, carriedQuery }))
    .filter((event) => inMonth(event.date, year, month))
}

export function buildCalendarEvents({
  tasks,
  scheduleItems,
  year,
  month,
  timeZone,
  locale,
  copy,
  returnTo,
  carriedQuery,
}: Readonly<{
  tasks: readonly CalendarTask[]
  scheduleItems: readonly CalendarScheduleItem[]
  year: number
  month: number
  timeZone: string
  locale: Locale
  copy: CalendarEventCopy
  returnTo: string
  carriedQuery: string
}>): CalendarEvent[] {
  return [
    ...taskEvents({ tasks, returnTo, year, month, locale, dueDateLabel: copy.dueDate }),
    ...scheduleEvents({ items: scheduleItems, year, month, timeZone, locale, copy, carriedQuery }),
  ]
}
