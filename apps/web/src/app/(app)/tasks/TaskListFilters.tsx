import { TASK_COPY } from '../../../i18n/config'
import type { Locale } from '../../../i18n/locale'
import { ListViewBar } from '../list-view-bar'

/** Search and the assignee filter above the tasks table; the choice lives in the URL so sorting and paging keep it. */
export function TaskListFilters({
  search,
  assignee,
  people,
  locale,
}: Readonly<{ search: string; assignee: string; people: ReadonlyMap<string, string>; locale: Locale }>) {
  const copy = TASK_COPY[locale]
  const options = [...people].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
  return (
    <ListViewBar
      searchLabel={copy.searchTasks}
      query={search}
      filters={[{ name: 'assignee', label: copy.assignee, allLabel: copy.anyAssignee, value: assignee, options }]}
    />
  )
}
