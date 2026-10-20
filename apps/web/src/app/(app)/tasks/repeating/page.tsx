import { Button } from '@ops/ui/components/ui/button'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { DataTable, paginationFor } from '@ops/ui/composites/DataTable'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { Repeat2 } from 'lucide-react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { REPEATING_COPY } from '../../../../i18n/repeating-copy'
import { TASK_COPY } from '../../../../i18n/config'
import { getWorkspaceSettings } from '../../../../server/auth/context'
import { getRequestContext } from '@/server/container'
import { loadRepeatingTasks } from '../../../../server/queries/work/repeating-tasks'
import { loadTaskPeople } from '../../../../server/queries/work/task-details'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { parseTaskPage } from '../../../../server/queries/work/tasks/listTasks'
import { firstParam } from '../../search-params'
import { labelsFor } from '../task-table'
import { validAssignee } from '../assignee-options'
import { TaskListFilters } from '../TaskListFilters'
import { TaskWorkspaceViews } from '../TaskWorkspaceViews'
import { repeatingColumns, repeatingRow } from './repeating-table'

export const metadata: Metadata = { title: 'Repeating work' }
export const dynamic = 'force-dynamic'
type Params = Record<string, string | string[] | undefined>

function readFilters(params: Params, people: ReadonlyMap<string, string>) {
  return {
    search: firstParam(params.q)?.trim() ?? '',
    assignee: validAssignee(firstParam(params.assignee), people),
    mine: firstParam(params.view) === 'mine',
    page: parseTaskPage(firstParam(params.page)),
  }
}

export default async function RepeatingPage({ searchParams }: Readonly<{ searchParams: Promise<Params> }>) {
  const params = await searchParams
  const context = await getRequestContext()
  const [locale, settings, people] = await Promise.all([
    loadWorkspaceLocale(),
    getWorkspaceSettings(),
    loadTaskPeople(),
  ])
  const copy = REPEATING_COPY[locale]
  const { search, assignee, mine, page } = readFilters(params, people)
  const result = await loadRepeatingTasks(context, {
    page,
    search,
    assignee,
    mine,
    timeZone: typeof settings.timezone === 'string' ? settings.timezone : 'UTC',
  })
  const href = (number: number) => {
    const query = new URLSearchParams()
    if (number > 1) query.set('page', String(number))
    if (search) query.set('q', search)
    if (assignee) query.set('assignee', assignee)
    if (mine) query.set('view', 'mine')
    const suffix = query.size ? '?' + query.toString() : ''
    return '/tasks/repeating' + suffix
  }
  const narrowed = search !== '' || assignee !== '' || mine
  const create = (
    <Button nativeButton={false} render={<Link href="/tasks/new?repeat=monthly" />}>
      {copy.newTask}
    </Button>
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: TASK_COPY[locale].allTasks, href: '/tasks' }, { label: copy.title }]} />
      <PageContent>
        <PageHeader
          title={copy.title}
          count={result.total}
          description={copy.description}
          actions={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {create}
              <TaskWorkspaceViews active="repeating" locale={locale} mine={mine} />
            </div>
          }
        />
        <TaskListFilters search={search} assignee={assignee} people={people} locale={locale} />
        <p className="text-xs text-muted-foreground">{copy.helper}</p>
        <DataTable
          columns={repeatingColumns(locale)}
          rows={result.items.map((item) => repeatingRow({ item, returnTo: href(page), locale }))}
          labels={labelsFor(locale)}
          pagination={paginationFor({ page: result.page, pageSize: result.pageSize, total: result.total, href })}
          emptyState={
            <EmptyState
              icon={Repeat2}
              title={narrowed ? copy.filteredEmpty : copy.empty}
              description={narrowed ? copy.filteredBody : copy.emptyBody}
              action={narrowed ? undefined : create}
            />
          }
          mobileCard={{ cells: ['title', 'people', 'cadence', 'next'] }}
        />
      </PageContent>
    </>
  )
}
