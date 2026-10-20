import { Badge } from '@ops/ui/components/ui/badge'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { FolderKanban } from 'lucide-react'
import Link from 'next/link'
import type { ProjectPageCopy } from '../../../../i18n/project-page-copy'
import { formatDate } from '../../../../i18n/format'
import type { WorkListTask } from '../../../../server/queries/work/read-models'
import ProjectBoard from './ProjectBoard'

export interface ProjectStage {
  id: string
  name: string
  category: 'backlog' | 'open' | 'active' | 'waiting' | 'done_success' | 'done_failure' | 'cancelled'
  color: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal' | 'pink'
}

export function ProjectOverview({
  description,
  taskCount,
  copy,
}: Readonly<{ description: string | null; taskCount: number; copy: ProjectPageCopy }>) {
  return (
    <div className="max-w-3xl space-y-5">
      <section className="border-b pb-5">
        <h2 className="mb-2 text-sm font-semibold">{copy.description}</h2>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
          {description === null || description.trim() === '' ? copy.noDescription : description}
        </p>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">{copy.work}</h2>
        <p className="text-sm text-muted-foreground">
          {taskCount === 1 ? copy.taskCountOne : copy.taskCountOther.replace('{count}', String(taskCount))}
        </p>
      </section>
    </div>
  )
}

export function ProjectBoardContent({
  tasks,
  stages,
  projectId,
  copy,
}: Readonly<{
  tasks: readonly WorkListTask[]
  stages: readonly ProjectStage[]
  projectId: string
  copy: ProjectPageCopy
}>) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={FolderKanban}
        title={copy.noProjectTasks}
        description={copy.noProjectTasksHelp}
        action={
          <a
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            href={`/tasks/new?projectId=${encodeURIComponent(projectId)}`}
          >
            {copy.createTask}
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
        meta:
          task.priority === 'none' ? undefined : (
            <Badge variant="secondary" className="capitalize">
              {task.priority}
            </Badge>
          ),
      }))}
    />
  )
}

export function ProjectTaskList({ tasks, copy }: Readonly<{ tasks: readonly WorkListTask[]; copy: ProjectPageCopy }>) {
  if (tasks.length === 0) return <p className="py-4 text-sm text-muted-foreground">{copy.noTasksYet}</p>
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

export function ProjectDetails({
  copy,
  project,
  organizationName,
  locale,
  timeZone,
}: Readonly<{
  copy: ProjectPageCopy
  project: {
    readonly organizationId: string | null
    readonly memberIds: readonly string[]
    readonly targetEndAt: number | null
  }
  organizationName: string | null
  locale: string
  timeZone: string
}>) {
  return (
    <div className="ops-detail-card rounded-lg border p-4">
      <h2 className="mb-3 font-medium">{copy.details}</h2>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{copy.organization}</dt>
          <dd>
            {project.organizationId === null || organizationName === null ? (
              <span className="text-muted-foreground">{copy.notLinked}</span>
            ) : (
              <Link href={`/organizations/${project.organizationId}`} className="font-medium hover:underline">
                {organizationName}
              </Link>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{copy.members}</dt>
          <dd>{project.memberIds.length}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{copy.targetEnd}</dt>
          <dd>
            {project.targetEndAt === null
              ? copy.noTarget
              : formatDate(project.targetEndAt, locale, {
                  dateStyle: 'medium',
                  timeZone: timeZone,
                })}
          </dd>
        </div>
      </dl>
    </div>
  )
}
