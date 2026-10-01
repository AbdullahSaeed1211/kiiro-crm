import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { ListTodo } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { TASK_COPY } from '../../../i18n/config'
import { formatTaskSort, listTasks, parseTaskPage, parseTaskSort } from '../../../server/queries/work/tasks/listTasks'
import { listSavedViews } from '../../../server/queries/settings/listSavedViews'
import { loadWorkspaceLocale } from '../../../server/queries/work/read-models'
import { getRequestContext } from '@/server/container'
import { firstParam } from '../search-params'
import { TaskBulkTable } from './TaskBulkTable'
import { TaskCreateForm } from './TaskCreateForm'
import { TaskViewMenu } from './TaskViewMenu'
import { TaskWorkspaceViews } from './TaskWorkspaceViews'
import { labelsFor, paginationOf, taskColumns, toRow } from './task-table'
import { parseTaskView, savedViewSort, taskListHref, taskModeOf } from './task-view-params'

const PAGE_TITLE = 'Tasks'

/** The parent app layout supplies the tenant's branded title suffix. */
export const metadata: Metadata = { title: PAGE_TITLE }

/** Tasks list (spec §17.5). */
export default async function TasksPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const {
    sort: sortParam,
    page: pageParam,
    view: viewParam,
    relatedType,
    relatedId,
    title: titleParam,
  } = await searchParams
  const context = await getRequestContext()
  const [savedViews, locale] = await Promise.all([listSavedViews('task', context), loadWorkspaceLocale()])
  const copy = TASK_COPY[locale]
  const sort = parseTaskSort(firstParam(sortParam))
  const view = parseTaskView(firstParam(viewParam), savedViews)
  const selectedSavedView = savedViews.find((savedView) => savedView.id === view)
  const effectiveSort = selectedSavedView === undefined ? sort : savedViewSort(selectedSavedView, sort)
  const taskMode = taskModeOf(view, selectedSavedView)
  const title = selectedSavedView?.name ?? { all: copy.allTasks, mine: copy.myTasks, open: copy.openTasks }[taskMode]
  const returnTo = taskListHref({ sort, page: parseTaskPage(firstParam(pageParam)), view })
  const result = await listTasks(
    {
      page: parseTaskPage(firstParam(pageParam)),
      sort: effectiveSort,
      view: taskMode,
    },
    context,
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <PageHeader
          title={title}
          count={result.total}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <TaskWorkspaceViews active="table" locale={locale} />
              <Link
                href="/tasks/new"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                New task
              </Link>
              <TaskViewMenu
                selectedId={view}
                locale={locale}
                customViews={savedViews.map((savedView) => ({
                  id: savedView.id,
                  label: savedView.name,
                  pinned: savedView.pinned,
                }))}
              />
              <TaskCreateForm
                relatedType={firstParam(relatedType)}
                relatedId={firstParam(relatedId)}
                initialTitle={firstParam(titleParam)}
              />
            </div>
          }
        />
        <TaskBulkTable
          versions={Object.fromEntries(result.items.map((task) => [task.id, task.updatedAt]))}
          // A new sort or page remounts the table, so row selection does not carry over to other rows.
          key={`${formatTaskSort(sort)}:${String(result.page)}`}
          columns={taskColumns({ sort: effectiveSort, view, locale })}
          rows={result.items.map((task) => toRow({ task, returnTo, locale }))}
          sort={{ id: effectiveSort.key, desc: effectiveSort.desc }}
          pagination={paginationOf({ result, sort: effectiveSort, view })}
          labels={labelsFor(locale)}
          emptyState={<EmptyState icon={ListTodo} title={copy.noTasks} description={copy.noTasksDescription} />}
          mobileCard={{ cells: ['title', 'context', 'stage', 'dueAt', 'assignees'] }}
        />
      </PageContent>
    </>
  )
}
