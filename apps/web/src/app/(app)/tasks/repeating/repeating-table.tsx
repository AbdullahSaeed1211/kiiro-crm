import { Badge } from '@ops/ui/components/ui/badge'
import type { DataTableColumn, DataTableRow } from '@ops/ui/composites/DataTable'
import Link from 'next/link'
import { REPEATING_COPY } from '../../../../i18n/repeating-copy'
import type { Locale } from '../../../../i18n/locale'
import type { loadRepeatingTasks } from '../../../../server/queries/work/repeating-tasks'
import { taskHref } from '../../task-navigation'

type Item = Awaited<ReturnType<typeof loadRepeatingTasks>>['items'][number]

export function repeatingColumns(locale: Locale): readonly DataTableColumn[] {
  const copy = REPEATING_COPY[locale]
  return [
    { id: 'title', header: copy.task, hideable: false },
    { id: 'people', header: copy.owner },
    { id: 'cadence', header: copy.cadence },
    { id: 'next', header: copy.next },
    { id: 'current', header: copy.current, defaultHidden: true },
  ]
}

export function repeatingRow({
  item,
  returnTo,
  locale,
}: Readonly<{ item: Item; returnTo: string; locale: Locale }>): DataTableRow {
  const copy = REPEATING_COPY[locale]
  const format = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  const date = (value: number | null) => (value === null ? copy.noDate : format.format(value))
  const href = taskHref(item.id, returnTo)
  return {
    id: item.id,
    href,
    cells: {
      title: (
        <div className="grid gap-1">
          <Link href={href} data-task-link-id={item.id} className="font-medium hover:underline">
            {item.title}
          </Link>
          <span className="text-xs text-muted-foreground">{item.context?.label ?? copy.internal}</span>
          {item.overdue ? (
            <Badge variant="outline" className="w-fit text-destructive">
              {copy.overdue}
            </Badge>
          ) : null}
        </div>
      ),
      people: <span className="text-sm">{item.people.join(', ') || copy.unassigned}</span>,
      cadence: item.repeat === 'none' ? '' : copy[item.repeat],
      next: date(item.nextRun),
      current: date(item.dueAt),
    },
  }
}
