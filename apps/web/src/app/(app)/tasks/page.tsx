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
import { parseTaskDue } from '../../../server/queries/work/task-due-filter'

const PAGE_TITLE = 'Tasks'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

type Params = Record<string, string | string[] | undefined>

/** The project a task belongs to; a task linked to a lead or deal has none, so it groups under "No project". */
function projectName(task: Readonly<{ context: { type: string; label: string } | null }>): string | undefined {
  return task.context?.type === 'project' ? task.context.label : undefined
}

/** What narrows the list, read from the address: the search text, the chosen assignee and the page. */
function readFilters(params: Params, actorId: string) {
  const requested = firstParam(params.assignee) ?? ''
  return {
    search: firstParam(params.q)?.trim() ?? '',
    assignee: requested === 'me' ? actorId : requested,
    page: parseTaskPage(firstParam(params.page)),
    due: parseTaskDue(firstParam(params.due)),
  }
}

/** Tasks list (spec §17.5). */
export default async function TasksPage({ searchParams }: Readonly<{ searchParams: Promise<Params> }>) {
  const params = await searchParams
  const context = await getRequestContext()
  const { search, assignee: requested, page, due } = readFilters(params, String(context.actor.id))
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
  const returnTo = taskListHref({ sort, page, view, search, assignee, due })
  const result = await listTasks({ page, sort: effectiveSort, view: taskMode, search, assignee, due }, context)
  const grouped = effectiveSort.key === 'project'
  const narrowed = search !== '' || assignee !== '' || due !== ''
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
        <TaskListFilters search={search} assignee={assignee} people={people} locale={locale} due={due} />
        <TaskBulkTable
          versions={Object.fromEntries(result.items.map((task) => [task.id, task.updatedAt]))}
          // A new sort or page remounts the table, so row selection does not carry over to other rows.
          key={`${formatTaskSort(sort)}:${String(result.page)}:${search}:${assignee}:${due}`}
          toolbarStart={
            <TaskGroupToggle
              grouped={grouped}
              view={view}
              search={search}
              assignee={assignee}
              locale={locale}
              due={due}
            />
          }
          columns={taskColumns({ sort: effectiveSort, view, locale, search, assignee, due })}
          rows={result.items.map((task) =>
            toRow({ task, returnTo, locale, ...(grouped && { group: projectName(task) ?? copy.noProject }) }),
          )}
          sort={{ id: effectiveSort.key, desc: effectiveSort.desc }}
          pagination={paginationOf({ result, sort: effectiveSort, view, search, assignee, due })}
          labels={labelsFor(locale)}
          emptyState={<EmptyState icon={ListTodo} title={emptyTitle} description={emptyBody} />}
          mobileCard={{ cells: ['title', 'context', 'stage', 'dueAt', 'assignees'] }}
        />
      </PageContent>
    </>
  )
}
