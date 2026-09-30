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
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'
import { DATA_TABLE_LABELS } from '../../../i18n/table-labels'
import { formatDate } from '../../../i18n/format'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'
import { ListSearchForm } from '../list-search-form'
import { firstParam } from '../search-params'

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

function Progress({ done, total }: Readonly<{ done: number; total: number }>) {
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

function rowOf(project: Project, model: Model): DataTableRow {
  const own = model.tasks.filter((task) => task.projectId === project.id)
  const done = own.filter((task) => task.stageCategory === 'done_success').length
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
      progress: <Progress done={done} total={own.length} />,
      target:
        project.targetEndAt === null ? (
          <EmptyValue />
        ) : (
          formatDate(project.targetEndAt, undefined, { dateStyle: 'medium', timeZone: model.timeZone })
        ),
    },
  }
}

function matching(
  projects: readonly Project[],
  { query, stage }: Readonly<{ query: string; stage: string }>,
): Project[] {
  const needle = query.toLowerCase()
  return projects.filter(
    (project) => project.name.toLowerCase().includes(needle) && (stage === '' || project.stage === stage),
  )
}

/** Projects list with progress from the same scoped read model, searchable by name and filterable by stage. */
export default async function ProjectsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const query = firstParam(params.q)?.trim() ?? ''
  const stage = firstParam(params.stage) ?? ''
  const model = await loadWorkReadModel(undefined, 'projects')
  const shown = matching(model.projects, { query, stage })
  const stages = [...new Set(model.projects.map((project) => project.stage))]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects' }]} />
      <PageContent>
        <PageHeader
          title="Projects"
          count={shown.length}
          actions={
            <a
              className="ops-action-button rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              href="/projects/new"
            >
              New project
            </a>
          }
        />
        <ListSearchForm
          action="/projects"
          label="Search projects"
          query={query}
          filter={{
            name: 'stage',
            label: 'Filter by stage',
            allLabel: 'All stages',
            value: stage,
            options: stages.map((name) => ({ value: name, label: name })),
          }}
        />
        <DataTable
          columns={COLUMNS}
          rows={shown.map((project) => rowOf(project, model))}
          pagination={paginationFor({
            page: 1,
            pageSize: Math.max(1, shown.length),
            total: shown.length,
            href: () => '',
          })}
          labels={DATA_TABLE_LABELS}
          mobileCard={{ cells: ['name', 'stage', 'progress', 'target'] }}
          emptyState={
            <EmptyState
              icon={FolderKanban}
              title={model.projects.length === 0 ? 'No projects yet' : 'No projects match'}
              description={
                model.projects.length === 0
                  ? 'Projects you create or join appear here.'
                  : 'Change the search or the stage filter.'
              }
            />
          }
        />
      </PageContent>
    </>
  )
}
