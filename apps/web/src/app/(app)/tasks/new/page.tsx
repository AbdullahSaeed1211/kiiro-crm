import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { asId } from '@ops/kernel'
import type { Metadata } from 'next'
import { NewTaskForm } from './NewTaskForm'
import { loadTaskContexts } from '../../../../server/queries/work/tasks/task-contexts'
import type { TaskListItem } from '../../../../server/queries/work/tasks/types'
import { loadWorkReadModel } from '../../../../server/queries/work/read-models'
import { getRequestContext } from '../../../../server/work/deps'
import { firstParam } from '../../search-params'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'New task' }

type RelatedType = 'organization' | 'contact' | 'lead' | 'deal'
type TaskContextLabel = NonNullable<TaskListItem['context']>
const RELATED_TYPES = new Set<RelatedType>(['organization', 'contact', 'lead', 'deal'])

function relatedTypeOf(value: string | undefined): RelatedType | null {
  return value !== undefined && RELATED_TYPES.has(value as RelatedType) ? (value as RelatedType) : null
}

function projectIdOf(projects: readonly { id: string }[], requestedId: string | undefined): string {
  return requestedId !== undefined && projects.some((project) => project.id === requestedId) ? requestedId : ''
}

async function recordContextOf(
  context: Awaited<ReturnType<typeof getRequestContext>>,
  requested: Readonly<{ type: RelatedType | null; id: string | undefined }>,
): Promise<Readonly<{ type: RelatedType | null; id: string | null; label: TaskContextLabel | null }>> {
  const { type, id } = requested
  if (type === null || id === undefined) return { type: null, id: null, label: null }
  const labels = await loadTaskContexts(context, [
    { id: asId('new-task'), projectId: null, relatedType: type, relatedId: asId(id) },
  ])
  const label = labels.get('new-task') ?? null
  return { type: label === null ? null : type, id: label === null ? null : id, label }
}

/** Creates a task with only project and CRM context visible to the current user. */
export default async function NewTaskPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = await searchParams
  const context = await getRequestContext()
  const model = await loadWorkReadModel(context, 'projects')
  const projectId = projectIdOf(model.projects, firstParam(query.projectId))
  const recordContext = await recordContextOf(context, {
    type: relatedTypeOf(firstParam(query.relatedType)),
    id: firstParam(query.relatedId),
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Tasks', href: '/tasks' }, { label: 'New task' }]} />
      <PageContent>
        <PageHeader title="New task" description="Add work, choose its project, and set a due date." />
        <NewTaskForm
          projects={model.projects.map(({ id, name }) => ({ value: id, label: name }))}
          projectId={projectId}
          relatedType={recordContext.type}
          relatedId={recordContext.id}
          relatedLabel={recordContext.label?.label ?? null}
          initialTitle={firstParam(query.title) ?? ''}
          cancelHref={recordContext.label?.href ?? (projectId === '' ? '/tasks' : `/projects/${projectId}`)}
        />
      </PageContent>
    </>
  )
}
