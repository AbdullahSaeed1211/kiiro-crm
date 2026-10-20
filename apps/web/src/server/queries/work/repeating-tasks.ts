import { TASK_REPEATS, nextRunAfter, todayAsDueAt } from '@ops/module-work'
import { asId } from '@ops/kernel'
import type { Where } from 'payload'
import type { RequestContext } from '../../container'
import { loadPeople } from '../../people'
import { loadTaskContexts } from './tasks/task-contexts'
import { mapTask } from './read-models'
import { loadWorkflowStages } from '../workflow-stages'

const PAGE_SIZE = 50
interface Filters {
  readonly page: number
  readonly search: string
  readonly assignee: string
  readonly mine: boolean
  readonly timeZone: string
}

function repeatingWhere(input: Filters, actorId: string, closed: readonly string[]): Where {
  return {
    and: [
      { repeat: { in: TASK_REPEATS.filter((value) => value !== 'none') } },
      ...(closed.length ? [{ stageId: { not_in: [...closed] } }] : []),
      ...(input.search ? [{ title: { contains: input.search } }] : []),
      ...(input.assignee ? [{ assignees: { contains: input.assignee } }] : []),
      ...(input.mine ? [{ assignees: { contains: actorId } }] : []),
    ],
  }
}

async function recurringPage(context: RequestContext, input: Filters) {
  const workflow = await loadWorkflowStages(context, 'task')
  const page = await context.payload.find({
    collection: 'tasks',
    depth: 0,
    overrideAccess: false,
    req: context.req,
    where: repeatingWhere(input, String(context.actor.id), workflow.closed),
    sort: ['dueAt', 'id'],
    limit: PAGE_SIZE,
    page: input.page,
  })
  return { page, tasks: page.docs.map((doc) => mapTask(doc, workflow.stages)) }
}

async function relatedPeople(context: RequestContext, data: Awaited<ReturnType<typeof recurringPage>>) {
  const [people, contexts] = await Promise.all([
    loadPeople(
      context,
      data.tasks.flatMap((task) => task.assigneeIds),
    ),
    loadTaskContexts(
      context,
      data.page.docs.map((doc) => ({
        id: asId(doc.id),
        projectId: typeof doc.project === 'string' ? asId(doc.project) : null,
        relatedType: doc.relatedType ?? null,
        relatedId: typeof doc.relatedId === 'string' ? asId(doc.relatedId) : null,
      })),
    ),
  ])
  return { people, contexts }
}

/** One active schedule carrier per chain; completion and catch-up make historical occurrences ordinary tasks. */
export async function loadRepeatingTasks(context: RequestContext, input: Filters) {
  const data = await recurringPage(context, input)
  const { people, contexts } = await relatedPeople(context, data)
  const today = todayAsDueAt(Date.now(), input.timeZone)
  return {
    total: data.page.totalDocs,
    page: data.page.page ?? input.page,
    pageSize: PAGE_SIZE,
    items: data.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      repeat: task.repeat,
      dueAt: task.dueAt,
      nextRun: task.dueAt === null ? null : nextRunAfter(task.dueAt, task.repeat, today - 1),
      overdue: task.dueAt !== null && task.dueAt < today,
      people: task.assigneeIds.flatMap((id) => people.get(id)?.name ?? []),
      context: contexts.get(task.id) ?? null,
    })),
  }
}
