import { Badge } from '@ops/ui/components/ui/badge'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { FolderKanban } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { loadProject, type WorkListTask } from '../../../../server/queries/work/read-models'
import { loadWorkReadModel } from '../../../../server/queries/work/read-models'
import ProjectBoard from './ProjectBoard'
import ProjectActions from './ProjectActions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Project' }

function projectTabs(
  tasks: readonly WorkListTask[],
  stages: readonly {
    id: string
    name: string
    category: 'backlog' | 'open' | 'active' | 'waiting' | 'done_success' | 'done_failure' | 'cancelled'
    color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'
  }[],
) {
  return [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Project overview and activity.</p>
          <p className="text-sm">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} in this project.
          </p>
        </div>
      ),
    },
    {
      id: 'board',
      label: 'Board',
      content:
        tasks.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No project tasks"
            description="Create a task from the Tasks workspace, then assign it to this project."
            action={
              <a className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/tasks">
                Open tasks
              </a>
            }
          />
        ) : (
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
        ),
    },
    {
      id: 'list',
      label: 'List',
      content: (
        <p className="text-sm text-muted-foreground">
          {tasks.filter((task) => task.completedAt === null).length} open tasks
        </p>
      ),
    },
  ]
}

/** Project record with Overview, Board, List and Files tabs. */
export default async function ProjectPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params
  const [result, model] = await Promise.all([loadProject(id), loadWorkReadModel()])
  if (result === undefined) notFound()
  const { project, tasks } = result
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project.name }]} />
      <PageContent>
        <RecordPageLayout
          title={project.name}
          labels={{ breadcrumb: 'Breadcrumb', saveTitle: 'Save title', cancelTitle: 'Cancel' }}
          stage={<Badge variant="secondary">{project.stage}</Badge>}
          tabs={projectTabs(tasks, model.stages)}
          actions={
            <ProjectActions
              projectId={project.id}
              updatedAt={project.updatedAt}
              memberIds={project.memberIds}
              people={[...model.people.entries()]}
            />
          }
          aside={
            <div className="ops-detail-card rounded-lg border p-4">
              <h2 className="mb-3 font-medium">Details</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Members</dt>
                  <dd>{project.memberIds.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Target end</dt>
                  <dd>
                    {project.targetEndAt === null
                      ? 'No target'
                      : new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: model.timeZone }).format(
                          project.targetEndAt,
                        )}
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
