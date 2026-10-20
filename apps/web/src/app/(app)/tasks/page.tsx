import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ListTodo } from 'lucide-react'
import type { Metadata } from 'next'
import { TASK_COPY } from '../../../i18n/config'
import { formatTaskSort, listTasks, parseTaskPage, parseTaskSort } from '../../../server/queries/work/tasks/listTasks'
import { listSavedViews } from '../../../server/queries/settings/listSavedViews'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { loadTaskPeople } from '../../../server/queries/work/task-details'
import { getRequestContext } from '@/server/container'
import { firstParam } from '../search-params'
import { TaskBulkTable } from './TaskBulkTable'
import { validAssignee } from './assignee-options'
import { SECTION_HELP_COPY } from '../../../i18n/section-help-copy'
import { catalogFor } from '../../../i18n/locale'
import { TaskGroupToggle } from './TaskGroupToggle'
import { TaskListFilters } from './TaskListFilters'
import { TasksHeaderActions } from './TasksHeaderActions'
import { labelsFor, paginationOf, taskColumns, toRow } from './task-table'
import { parseTaskView, savedViewSort, taskListHref, taskModeOf } from './task-view-params'

const PAGE_TITLE = 'Tasks'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

type Params = Record<string, string | string[] | undefined>

/** The project a task belongs to; a task linked to a lead or deal has none, so it groups under "No project". */
function projectName(task: Readonly<{ context: { type: string; label: string } | null }>): string | undefined {
  return task.context?.type === 'project' ? task.context.label : undefined
}

/** What narrows the list, read from the address: the search text, the chosen assignee and the page. */
function readFilters(params: Params) {
  return {
    search: firstParam(params.q)?.trim() ?? '',
    assignee: firstParam(params.assignee) ?? '',
    page: parseTaskPage(firstParam(params.page)),
  }
}

/** Tasks list (spec §17.5). */
export default async function TasksPage({ searchParams }: Readonly<{ searchParams: Promise<Params> }>) {
  const params = await searchParams
  const { search, assignee: requested, page } = readFilters(params)
  const context = await getRequestContext()
  const [savedViews, locale, people] = await Promise.all([
    listSavedViews('task', context),
    loadWorkspaceLocale(),
    loadTaskPeople(),
  ])
  const assignee = validAssignee(requested, people)
  const copy = TASK_COPY[locale]
  const sort = parseTaskSort(firstParam(params.sort))
  const view = parseTaskView(firstParam(params.view), savedViews)
  const selectedSavedView = savedViews.find((savedView) => savedView.id === view)
  const effectiveSort = selectedSavedView === undefined ? sort : savedViewSort(selectedSavedView, sort)
  const taskMode = taskModeOf(view, selectedSavedView)
  const title = selectedSavedView?.name ?? { all: copy.allTasks, mine: copy.myTasks, open: copy.openTasks }[taskMode]
  const returnTo = taskListHref({ sort, page, view, search, assignee })
  const result = await listTasks({ page, sort: effectiveSort, view: taskMode, search, assignee }, context)
  const grouped = effectiveSort.key === 'project'
  const narrowed = search !== '' || assignee !== ''
  const emptyTitle = narrowed ? copy.noTasksMatch : copy.noTasks
  const emptyBody = narrowed ? copy.noTasksMatchDescription : copy.noTasksDescription
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <PageHeader
          title={title}
          count={result.total}
          description={catalogFor(SECTION_HELP_COPY, locale).tasks}
          actions={
            <TasksHeaderActions
              view={view}
              locale={locale}
              savedViews={savedViews}
              initial={{
                relatedType: firstParam(params.relatedType),
                relatedId: firstParam(params.relatedId),
                title: firstParam(params.title),
              }}
            />
          }
        />
        <TaskListFilters search={search} assignee={assignee} people={people} locale={locale} />
        <TaskBulkTable
          versions={Object.fromEntries(result.items.map((task) => [task.id, task.updatedAt]))}
          // A new sort or page remounts the table, so row selection does not carry over to other rows.
          key={`${formatTaskSort(sort)}:${String(result.page)}:${search}:${assignee}`}
          toolbarStart={
            <TaskGroupToggle grouped={grouped} view={view} search={search} assignee={assignee} locale={locale} />
          }
          columns={taskColumns({ sort: effectiveSort, view, locale, search, assignee })}
          rows={result.items.map((task) =>
            toRow({ task, returnTo, locale, ...(grouped && { group: projectName(task) ?? copy.noProject }) }),
          )}
          sort={{ id: effectiveSort.key, desc: effectiveSort.desc }}
          pagination={paginationOf({ result, sort: effectiveSort, view, search, assignee })}
          labels={labelsFor(locale)}
          emptyState={<EmptyState icon={ListTodo} title={emptyTitle} description={emptyBody} />}
          mobileCard={{ cells: ['title', 'context', 'stage', 'dueAt', 'assignees'] }}
        />
      </PageContent>
    </>
  )
}
