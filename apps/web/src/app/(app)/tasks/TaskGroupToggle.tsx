import Link from 'next/link'
import { TASK_COPY } from '../../../i18n/config'
import type { Locale } from '../../../i18n/locale'
import type { TaskSort } from '../../../server/queries/work/tasks/types'
import { taskListHref } from './task-view-params'

const BY_DUE_DATE: TaskSort = { key: 'dueAt', desc: false }
const BY_RELATED: TaskSort = { key: 'project', desc: false }

/** Switches the list between plain rows and one heading per related record, which is the same list sorted by that column. */
export function TaskGroupToggle({
  grouped,
  view,
  search,
  assignee,
  locale,
}: Readonly<{ grouped: boolean; view: string; search: string; assignee: string; locale: Locale }>) {
  const copy = TASK_COPY[locale]
  const link = (active: boolean) =>
    active ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground hover:underline'
  return (
    <nav aria-label={copy.groupBy} className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{copy.groupBy}</span>
      <Link
        className={link(!grouped)}
        aria-current={grouped ? undefined : 'true'}
        href={taskListHref({ sort: BY_DUE_DATE, page: 1, view, search, assignee })}
      >
        {copy.groupNone}
      </Link>
      <Link
        className={link(grouped)}
        aria-current={grouped ? 'true' : undefined}
        href={taskListHref({ sort: BY_RELATED, page: 1, view, search, assignee })}
      >
        {copy.project}
      </Link>
    </nav>
  )
}
