import { TASK_COPY } from '../../../i18n/config'
import type { Locale } from '../../../i18n/locale'
import { ListViewBar } from '../list-view-bar'
import { assigneeOptions } from './assignee-options'

/** Search and the assignee filter above the tasks table; the choice lives in the URL so sorting and paging keep it. */
export function TaskListFilters({
  search,
  assignee,
  people,
  locale,
  due,
}: Readonly<{ search: string; assignee: string; people: ReadonlyMap<string, string>; locale: Locale; due?: string }>) {
  const copy = TASK_COPY[locale]
  return (
    <ListViewBar
      searchLabel={copy.searchTasks}
      query={search}
      filters={[
        {
          name: 'assignee',
          label: copy.assignee,
          allLabel: copy.anyAssignee,
          value: assignee,
          options: assigneeOptions(people),
        },
        ...(due === undefined
          ? []
          : [
              {
                name: 'due',
                label: copy.due,
                allLabel: copy.anyDate,
                value: due,
                options: [
                  { value: 'overdue', label: copy.overdue },
                  { value: 'week', label: copy.dueThisWeek },
                ],
              },
            ]),
      ]}
    />
  )
}
