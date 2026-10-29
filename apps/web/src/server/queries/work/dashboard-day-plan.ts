import type { Where } from 'payload'
import type { RequestContext } from '../../container'
import type { DashboardPlanItem, DashboardTask } from './dashboard-model'

interface DashboardDayPlan {
  readonly count: number
  readonly items: readonly DashboardPlanItem[]
}
interface Scope {
  readonly actorId: string
  readonly dayStart: number
  readonly team: boolean
  readonly personFilter: string
  readonly people: readonly { readonly id: string; readonly name: string }[]
}
interface TaskPage {
  readonly items: readonly DashboardTask[]
}
type LoadTasks = (options: {
  context: RequestContext
  where: Where
  finishedStages: readonly string[]
  limit: number
}) => Promise<TaskPage>

function planUserIds(scope: Scope): readonly string[] {
  if (!scope.team) return [scope.actorId]
  if (scope.personFilter === 'unassigned') return []
  if (scope.personFilter === 'everyone') return scope.people.map((person) => person.id)
  return [scope.personFilter]
}

/** Loads authorized daily plan entries and the visible task records they reference. */
export async function loadDashboardDayPlan(options: {
  readonly context: RequestContext
  readonly scope: Scope
  readonly finishedStages: readonly string[]
  readonly loadTasks: LoadTasks
}): Promise<DashboardDayPlan> {
  const { context, scope, finishedStages, loadTasks } = options
  const userIds = planUserIds(scope)
  if (userIds.length === 0) return { count: 0, items: [] }
  const where: Where = { and: [{ day: { equals: scope.dayStart } }, { user: { in: userIds } }] }
  const [plans, total] = await Promise.all([
    context.payload.find({
      collection: 'taskDayPlans',
      where,
      sort: ['createdAt', 'id'],
      limit: 30,
      depth: 0,
      select: { task: true, user: true },
      overrideAccess: false,
      req: context.req,
    }),
    context.payload.count({ collection: 'taskDayPlans', where, overrideAccess: false, req: context.req }),
  ])
  const ids = plans.docs.flatMap((plan) => (typeof plan.task === 'string' ? [plan.task] : []))
  if (ids.length === 0) return { count: total.totalDocs, items: [] }
  const tasks = await loadTasks({ context, where: { id: { in: ids } }, finishedStages, limit: 30 })
  const byId = new Map(tasks.items.map((task) => [String(task.id), task]))
  const people = new Map(scope.people.map((person) => [person.id, person.name]))
  const items = plans.docs.flatMap((plan) => {
    const task = byId.get(typeof plan.task === 'string' ? plan.task : '')
    const userId = typeof plan.user === 'string' ? plan.user : ''
    return task === undefined || userId === '' ? [] : [{ userId, personName: people.get(userId) ?? '', task }]
  })
  return { count: total.totalDocs, items }
}
