import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { AvatarStack } from '@ops/ui/composites/Collaboration/Primitives'
import { FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'
import { loadWorkReadModel } from '../../../server/queries/work/read-models'
import { formatDate } from '../../../i18n/format'

export const metadata: Metadata = { title: 'Projects' }
export const dynamic = 'force-dynamic'

type Project = Awaited<ReturnType<typeof loadWorkReadModel>>['projects'][number]
type Task = Awaited<ReturnType<typeof loadWorkReadModel>>['tasks'][number]

function formatProjectDate(value: number | null, timeZone: string): string {
  return value === null ? 'No target' : formatDate(value, undefined, { dateStyle: 'medium', timeZone })
}

function Progress({ done, total }: Readonly<{ done: number; total: number }>) {
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span className="tabular-nums">
          {done}/{total} done
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${String(percentage)}% complete`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${String(percentage)}%` }}
        />
      </div>
    </div>
  )
}

function ProjectMobileList({
  projects,
  tasks,
  people,
  timeZone,
}: Readonly<{
  projects: readonly Project[]
  tasks: readonly Task[]
  people: ReadonlyMap<string, string>
  timeZone: string
}>) {
  return (
    <div className="mt-4 grid gap-2 md:hidden">
      {projects.map((project) => (
        <a
          className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/projects/${project.id}`}
          key={project.id}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="min-w-0 truncate font-medium">{project.name}</span>
            <Badge variant="secondary">{project.stage}</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>
              <dt>Members</dt>
              <dd className="mt-0.5 text-sm text-foreground">{project.memberIds.length}</dd>
            </div>
            <div>
              <dt>Target end</dt>
              <dd className="mt-0.5 text-sm text-foreground">{formatProjectDate(project.targetEndAt, timeZone)}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <Progress
              done={
                tasks.filter((task) => task.projectId === project.id && task.stageCategory === 'done_success').length
              }
              total={tasks.filter((task) => task.projectId === project.id).length}
            />
          </div>
          <div className="mt-3">
            <AvatarStack users={project.memberIds.map((id) => ({ id, name: people.get(id) ?? 'Teammate' }))} />
          </div>
        </a>
      ))}
    </div>
  )
}

function ProjectTable({
  projects,
  tasks,
  people,
  timeZone,
}: Readonly<{
  projects: readonly Project[]
  tasks: readonly Task[]
  people: ReadonlyMap<string, string>
  timeZone: string
}>) {
  return (
    <div className="ops-data-table mt-4 hidden overflow-x-auto md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-muted/30 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Members</th>
            <th className="px-4 py-3">Progress</th>
            <th className="px-4 py-3">Target end</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr className="border-b last:border-0 hover:bg-muted/30" key={project.id}>
              <td className="px-4 py-3 font-medium">
                <a className="hover:text-primary" href={`/projects/${project.id}`}>
                  {project.name}
                </a>
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary">{project.stage}</Badge>
              </td>
              <td className="px-4 py-3">
                <AvatarStack users={project.memberIds.map((id) => ({ id, name: people.get(id) ?? 'Teammate' }))} />
              </td>
              <td className="min-w-44 px-4 py-3">
                <Progress
                  done={
                    tasks.filter((task) => task.projectId === project.id && task.stageCategory === 'done_success')
                      .length
                  }
                  total={tasks.filter((task) => task.projectId === project.id).length}
                />
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatProjectDate(project.targetEndAt, timeZone)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Projects list with open-task counts from the same scoped read model. */
export default async function ProjectsPage() {
  const model = await loadWorkReadModel()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects' }]} />
      <PageContent>
        <PageHeader
          title="Projects"
          count={model.projects.length}
          actions={
            <a
              className="ops-action-button rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              href="/projects/new"
            >
              New project
            </a>
          }
        />
        {model.projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Projects you create or join appear here."
          />
        ) : (
          <>
            <ProjectMobileList
              projects={model.projects}
              tasks={model.tasks}
              people={model.people}
              timeZone={model.timeZone}
            />
            <ProjectTable
              projects={model.projects}
              tasks={model.tasks}
              people={model.people}
              timeZone={model.timeZone}
            />
          </>
        )}
      </PageContent>
    </>
  )
}
