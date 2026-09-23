import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getOrganizationLabel } from '../../../../server/crm/directory/data'
import { loadWorkReadModel, type WorkListTask } from '../../../../server/queries/work/read-models'
import ProjectBoard from './ProjectBoard'
import ProjectActions from './ProjectActions'
import { formatDate } from '../../../../i18n/format'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Project' }

interface ProjectStage {
  id: string
  name: string
  category: 'backlog' | 'open' | 'active' | 'waiting' | 'done_success' | 'done_failure' | 'cancelled'
  color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'
}

function ProjectOverview({ description, taskCount }: Readonly<{ description: string | null; taskCount: number }>) {
  return (
    <div className="max-w-3xl space-y-5">
      <section className="border-b pb-5">
        <h2 className="mb-2 text-sm font-semibold">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {description === null || description.trim() === '' ? 'No description yet.' : description}
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">Work</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">{taskCount}</span> task
          {taskCount === 1 ? '' : 's'} in this project
        </p>
      </section>
    </div>
  )
}

function ProjectBoardContent({
  tasks,
  stages,
  projectId,
}: Readonly<{ tasks: readonly WorkListTask[]; stages: readonly ProjectStage[]; projectId: string }>) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title="No project tasks"
        description="Create a task from the Tasks workspace, then assign it to this project."
        action={
          <a
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            href={`/tasks/new?projectId=${encodeURIComponent(projectId)}`}
          >
            Create task
          </a>
        }
      />
    )
  }
  return (
    <ProjectBoard
      stages={stages}
      cards={tasks.map((task) => ({
        id: task.id,
        stageId: task.stageId,
        title: task.title,
        updatedAt: task.updatedAt,
        meta: <Badge variant="secondary">{task.priority}</Badge>,
      }))}
    />
  )
}

function ProjectTaskList({ tasks }: Readonly<{ tasks: readonly WorkListTask[] }>) {
  if (tasks.length === 0) return <p className="py-4 text-sm text-muted-foreground">No tasks in this project yet.</p>
  return (
    <div className="divide-y border-y">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/tasks/${task.id}`}
          className="flex min-h-11 items-center justify-between gap-4 px-2 text-sm hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 truncate font-medium">{task.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{task.stage}</span>
        </Link>
      ))}
    </div>
  )
}

function projectTabs({
  tasks,
  description,
  stages,
  projectId,
}: Readonly<{
  tasks: readonly WorkListTask[]
  description: string | null
  stages: readonly ProjectStage[]
  projectId: string
}>) {
  return [
    {
      id: 'overview',
      label: 'Overview',
      content: <ProjectOverview description={description} taskCount={tasks.length} />,
    },
    {
      id: 'board',
      label: 'Board',
      content: <ProjectBoardContent tasks={tasks} stages={stages} projectId={projectId} />,
    },
    {
      id: 'list',
      label: 'List',
      content: <ProjectTaskList tasks={tasks} />,
    },
  ]
}

/** Project record with overview, board, and list tabs. */
export default async function ProjectPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const model = await loadWorkReadModel()
  const project = model.projects.find((item) => item.id === id)
  if (project === undefined) notFound()
  const tasks = model.tasks.filter((task) => task.projectId === project.id)
  const organizationName = project.organizationId === null ? null : await getOrganizationLabel(project.organizationId)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects', href: '/projects' }]} />
      <PageContent>
        <RecordPageLayout
          title={project.name}
          labels={{ breadcrumb: 'Breadcrumb', saveTitle: 'Save title', cancelTitle: 'Cancel' }}
          stage={<Badge variant="secondary">{project.stage}</Badge>}
          tabs={projectTabs({ tasks, description: project.description, stages: model.stages, projectId: project.id })}
          actions={
            <div className="grid gap-2">
              <Link
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                href={`/tasks/new?projectId=${encodeURIComponent(project.id)}`}
              >
                Create task
              </Link>
              <ProjectActions
                projectId={project.id}
                updatedAt={project.updatedAt}
                memberIds={project.memberIds}
                people={[...model.people.entries()]}
              />
            </div>
          }
          aside={
            <div className="ops-detail-card rounded-lg border p-4">
              <h2 className="mb-3 font-medium">Details</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Organization</dt>
                  <dd>
                    {project.organizationId === null || organizationName === null ? (
                      <span className="text-muted-foreground">Not linked</span>
                    ) : (
                      <Link href={`/organizations/${project.organizationId}`} className="font-medium hover:underline">
                        {organizationName}
                      </Link>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Members</dt>
                  <dd>{project.memberIds.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Target end</dt>
                  <dd>
                    {project.targetEndAt === null
                      ? 'No target'
                      : formatDate(project.targetEndAt, model.locale, {
                          dateStyle: 'medium',
                          timeZone: model.timeZone,
                        })}
                  </dd>
                </div>
              </dl>
            </div>
          }
        />
      </PageContent>
    </>
  )
}
