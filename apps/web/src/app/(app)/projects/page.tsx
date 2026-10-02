import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { AvatarStack } from '@ops/ui/composites/Collaboration/Primitives'
import {
  DataTable,
  EmptyValue,
  paginationFor,
  type DataTableColumn,
  type DataTableRow,
} from '@ops/ui/composites/DataTable'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { Metadata } from 'next'
import { DATA_TABLE_LABELS } from '../../../i18n/table-labels'
import { formatDate } from '../../../i18n/format'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'
import { loadProjectProgress, type Progress } from '../../../server/queries/work/project-progress'
import { getRequestContext } from '@/server/container'
import { ListViewBar, type ListSort } from '../list-view-bar'
import { firstParam } from '../search-params'
import { ListEmpty } from '../ListEmpty'

export const metadata: Metadata = { title: 'Projects' }
export const dynamic = 'force-dynamic'

type Model = Awaited<ReturnType<typeof loadWorkReadModel>>
type Project = Model['projects'][number]

const COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Name', hideable: false },
  { id: 'stage', header: 'Stage' },
  { id: 'members', header: 'Members' },
  { id: 'progress', header: 'Progress' },
  { id: 'target', header: 'Target end' },
]

function ProgressBar({ done, total }: Readonly<{ done: number; total: number }>) {
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="min-w-32 space-y-1.5">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${String(percentage)}% complete`}
      >
        <div className="h-full rounded-full bg-primary" style={{ width: `${String(percentage)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {done}/{total} done
      </span>
    </div>
  )
}

function rowOf(project: Project, shared: Readonly<{ model: Model; progress: Progress | undefined }>): DataTableRow {
  const { model, progress } = shared
  return {
    id: project.id,
    cells: {
      name: (
        <a className="font-medium hover:underline" href={`/projects/${project.id}`}>
          {project.name}
        </a>
      ),
      stage: <Badge variant="secondary">{project.stage}</Badge>,
      members: (
        <AvatarStack users={project.memberIds.map((id) => ({ id, name: model.people.get(id) ?? 'Teammate' }))} />
      ),
      progress: <ProgressBar done={progress?.done ?? 0} total={progress?.total ?? 0} />,
      target:
        project.targetEndAt === null ? (
          <EmptyValue />
        ) : (
          formatDate(project.targetEndAt, undefined, { dateStyle: 'medium', timeZone: model.timeZone })
        ),
    },
  }
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Name: A to Z' },
  { value: '-name', label: 'Name: Z to A' },
  { value: 'target', label: 'Target end: soonest' },
] as const

const sortMenu = (value: string): ListSort => ({ value, options: SORT_OPTIONS })

const NO_TARGET = Number.POSITIVE_INFINITY
const PAGE_SIZE = 50

/** The Projects address for a page, keeping the search, stage filter and sort. */
function pageHref(input: Readonly<{ query: string; stage: string; sort: string; page: number }>): string {
  const params = new URLSearchParams()
  if (input.query !== '') params.set('q', input.query)
  if (input.stage !== '') params.set('stage', input.stage)
  if (input.sort !== 'name') params.set('sort', input.sort)
  params.set('page', String(input.page))
  return `?${params.toString()}`
}

/** Compares two projects for the chosen sort; projects without a target end sort last. */
function compareProjects(sort: string): (left: Project, right: Project) => number {
  if (sort === '-name') return (left, right) => right.name.localeCompare(left.name)
  if (sort === 'target')
    return (left, right) =>
      (left.targetEndAt ?? NO_TARGET) - (right.targetEndAt ?? NO_TARGET) || left.name.localeCompare(right.name)
  return (left, right) => left.name.localeCompare(right.name)
}

function matching(
  projects: readonly Project[],
  { query, stage, sort }: Readonly<{ query: string; stage: string; sort: string }>,
): Project[] {
  const needle = query.toLowerCase()
  return projects
    .filter((project) => project.name.toLowerCase().includes(needle) && (stage === '' || project.stage === stage))
    .toSorted(compareProjects(sort))
}

/** Projects list with progress from the same scoped read model, searchable by name and filterable by stage. */
type SearchParams = Record<string, string | string[] | undefined>

/** Reads the projects for the address: the search, stage and sort applied, one page shown, with progress for that page. */
async function loadView(params: SearchParams) {
  const query = firstParam(params.q)?.trim() ?? ''
  const stage = firstParam(params.stage) ?? ''
  const sort = firstParam(params.sort) ?? 'name'
  const context = await getRequestContext()
  const model = await loadWorkReadModel(context, 'projects')
  const matched = matching(model.projects, { query, stage, sort })
  const page = Math.max(1, Number(firstParam(params.page) ?? 1) || 1)
  const shown = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const progress = await loadProjectProgress(context, {
    projectIds: shown.map((project) => project.id),
    doneStageIds: new Set(model.stages.filter((item) => item.category === 'done_success').map((item) => item.id)),
  })
  return { query, stage, sort, model, matched, page, shown, progress }
}

/** Projects list with progress from the same scoped read model, searchable by name and filterable by stage. */
export default async function ProjectsPage({ searchParams }: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const { query, stage, sort, model, matched, page, shown, progress } = await loadView(await searchParams)
  const stages = [...new Set(model.projects.map((project) => project.stage))]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects' }]} />
      <PageContent>
        <PageHeader
          title="Projects"
          count={matched.length}
          actions={
            <a
              className="ops-action-button rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              href="/projects/new"
            >
              New project
            </a>
          }
        />
        <ListViewBar
          searchLabel="Search projects"
          query={query}
          filters={[
            {
              name: 'stage',
              label: 'Filter by stage',
              allLabel: 'All stages',
              value: stage,
              options: stages.map((name) => ({ value: name, label: name })),
            },
          ]}
          sort={sortMenu(sort)}
        />
        <DataTable
          columns={COLUMNS}
          rows={shown.map((project) => rowOf(project, { model, progress: progress.get(project.id) }))}
          pagination={paginationFor({
            page,
            pageSize: PAGE_SIZE,
            total: matched.length,
            href: (next) => pageHref({ query, stage, sort, page: next }),
          })}
          labels={DATA_TABLE_LABELS}
          mobileCard={{ cells: ['name', 'stage', 'progress', 'target'] }}
          emptyState={<ListEmpty kind="projects" filtered={model.projects.length > 0} clearHref="/projects" />}
        />
      </PageContent>
    </>
  )
}
