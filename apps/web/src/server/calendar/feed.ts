import type { Payload } from 'payload'
import type { User } from '../../payload-types'
import { workflowStages } from '../queries/work/read-models'
import type { FeedEvent } from './ics'

const TOKEN_BYTES = 24
const CONTEXT = { authOperation: 'privateFields' } as const
const CLOSED = new Set(['done_success', 'done_failure', 'cancelled'])
const LIMIT = 200

const day = (epochMs: number): string => new Date(epochMs).toISOString().slice(0, 10)

/** A new unguessable address secret. */
const newToken = (): string =>
  [...crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))].map((byte) => byte.toString(16).padStart(2, '0')).join('')

async function setToken(payload: Payload, userId: string, token: string | null): Promise<void> {
  await payload.update({
    collection: 'users',
    id: userId,
    data: { calendarToken: token },
    depth: 0,
    overrideAccess: true,
    context: CONTEXT,
  })
}

/** Whether this user has a calendar feed, and the secret in its address. */
export async function calendarTokenOf(payload: Payload, userId: string): Promise<string | null> {
  const user: User = await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })
  return typeof user.calendarToken === 'string' && user.calendarToken !== '' ? user.calendarToken : null
}

/** Makes (or replaces) the user's feed address; the old address stops working. */
export async function rotateCalendarToken(payload: Payload, userId: string): Promise<string> {
  const token = newToken()
  await setToken(payload, userId, token)
  return token
}

/** Turns the user's feed off. */
export async function clearCalendarToken(payload: Payload, userId: string): Promise<void> {
  await setToken(payload, userId, null)
}

/** The user the secret belongs to, or null when no feed uses it. */
export async function userForCalendarToken(payload: Payload, token: string): Promise<User | null> {
  if (!/^[0-9a-f]{48}$/u.test(token)) return null
  const found = await payload.find({
    collection: 'users',
    where: { and: [{ calendarToken: { equals: token } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return found.docs[0] ?? null
}

/** Ids of the stages that are finished (done, failed or cancelled) in the task and lead workflows. */
async function closedStageIds(payload: Payload): Promise<ReadonlySet<string>> {
  const workflows = await payload.find({
    collection: 'workflows',
    where: { recordType: { in: ['task', 'lead'] } },
    limit: 20,
    depth: 0,
    overrideAccess: true,
  })
  return new Set(
    workflowStages(workflows.docs)
      .filter((stage) => CLOSED.has(stage.category))
      .map((stage) => stage.id),
  )
}

const stageOf = (doc: object): string => {
  const stage = (doc as { stageId?: unknown }).stageId
  return typeof stage === 'string' ? stage : ''
}

/** The user's assigned tasks that have a due date, and the leads they own that have a next action date. */
async function loadDated(payload: Payload, userId: string) {
  const options = { limit: LIMIT, depth: 0, overrideAccess: true } as const
  const [tasks, leads] = await Promise.all([
    payload.find({
      collection: 'tasks',
      where: { and: [{ assignees: { contains: userId } }, { dueAt: { exists: true } }] },
      sort: 'dueAt',
      ...options,
    }),
    payload.find({
      collection: 'leads',
      where: { and: [{ owner: { equals: userId } }, { nextActionAt: { exists: true } }] },
      sort: 'nextActionAt',
      ...options,
    }),
  ])
  return { tasks: tasks.docs, leads: leads.docs }
}

/** Open tasks assigned to the user that have a due date, and open leads they own that have a next action date. */
export async function feedEvents(payload: Payload, input: { user: User; origin: string }): Promise<FeedEvent[]> {
  const { user, origin } = input
  const [{ tasks, leads }, closed] = await Promise.all([loadDated(payload, user.id), closedStageIds(payload)])
  const taskEvents = tasks.flatMap((task) =>
    typeof task.dueAt === 'number' && !closed.has(stageOf(task))
      ? [
          {
            uid: `task-${task.id}@ops`,
            day: day(task.dueAt),
            summary: `Task: ${task.title}`,
            description: 'Task due',
            url: `${origin}/tasks/${task.id}`,
          },
        ]
      : [],
  )
  const leadEvents = leads.flatMap((lead) =>
    typeof lead.nextActionAt === 'number' && !closed.has(stageOf(lead))
      ? [
          {
            uid: `lead-${lead.id}@ops`,
            day: day(lead.nextActionAt),
            summary: `Follow up: ${lead.title}`,
            description: 'Lead follow-up',
            url: `${origin}/leads/${lead.id}`,
          },
        ]
      : [],
  )
  return [...taskEvents, ...leadEvents]
}
