import { createNotificationStore } from '@ops/adapter-payload'
import { asId } from '@ops/kernel'
import type { AutomationRule, RuleAction, RuleCandidate } from '@ops/module-automation'
import type { Payload } from 'payload'
import { DAY_MS } from './candidate-common'

type NotifyAction = Extract<RuleAction, { kind: 'notify' }>
type TaskAction = Extract<RuleAction, { kind: 'create_task' }>
type AssignAction = Extract<RuleAction, { kind: 'assign_owner' }>

/** What one action did, stored on the run row and shown without raw error text. */
export interface ActionOutcome {
  readonly kind: RuleAction['kind']
  readonly ok: boolean
  readonly detail?: string
}

export interface ActionInput {
  readonly payload: Payload
  readonly rule: AutomationRule
  readonly candidate: RuleCandidate
  readonly action: RuleAction
  readonly key: string
  readonly windowEnd: number
}

const OWNER_COLLECTIONS: Readonly<Record<string, 'leads' | 'deals' | undefined>> = { lead: 'leads', deal: 'deals' }
type TaskRelatedType = 'lead' | 'deal' | 'task' | 'project' | 'organization' | 'contact'
const TASK_RELATED_TYPES: Readonly<Record<string, TaskRelatedType | undefined>> = {
  lead: 'lead',
  deal: 'deal',
  task: 'task',
}
const TASK_RANK = '000000000001'

function assigneeFor(action: TaskAction, rule: AutomationRule, candidate: RuleCandidate): string | null {
  return action.assignee === 'me' ? rule.createdById : (candidate.ownerId ?? null)
}

async function taskWorkflowStart(payload: Payload): Promise<{ workflow: string; stageId: string } | null> {
  const found = await payload.find({
    collection: 'workflows',
    where: { recordType: { equals: 'task' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const workflow = found.docs.at(0)
  if (workflow === undefined || typeof workflow.defaultStageId !== 'string' || workflow.defaultStageId === '')
    return null
  return { workflow: workflow.id, stageId: workflow.defaultStageId }
}

async function taskExists(payload: Payload, action: TaskAction, candidate: RuleCandidate): Promise<boolean> {
  const found = await payload.find({
    collection: 'tasks',
    where: {
      and: [
        { title: { equals: action.title } },
        { relatedType: { equals: candidate.record.type } },
        { relatedId: { equals: candidate.record.id } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return found.docs.length > 0
}

async function notifyAction(input: ActionInput & { readonly action: NotifyAction }): Promise<ActionOutcome> {
  const outcome = await createNotificationStore(input.payload).insertIfAbsent({
    userId: asId(input.action.userId),
    type: 'automation',
    // One run can notify several people; the run key alone would let the first insert suppress the rest.
    dedupeKey: `${input.key}|notify|${input.action.userId}`,
    record: { type: input.candidate.record.type, id: asId(input.candidate.record.id) },
    data: { title: input.rule.name, trigger: input.rule.trigger.kind },
  })
  return {
    kind: 'notify',
    ok: true,
    detail: outcome === 'created' ? 'Notification sent.' : 'Notification already sent.',
  }
}

async function createTaskAction(input: ActionInput & { readonly action: TaskAction }): Promise<ActionOutcome> {
  const assignee = assigneeFor(input.action, input.rule, input.candidate)
  if (assignee === null) return { kind: 'create_task', ok: false, detail: 'No record owner to assign the task to.' }
  if (await taskExists(input.payload, input.action, input.candidate))
    return { kind: 'create_task', ok: true, detail: 'Task already exists.' }
  const start = await taskWorkflowStart(input.payload)
  if (start === null) return { kind: 'create_task', ok: false, detail: 'No task workflow with a start stage.' }
  const relatedType = TASK_RELATED_TYPES[input.candidate.record.type]
  if (relatedType === undefined)
    return { kind: 'create_task', ok: false, detail: 'This record type cannot have a task.' }
  await input.payload.create({
    collection: 'tasks',
    overrideAccess: true,
    data: {
      title: input.action.title,
      dueAt: input.windowEnd + input.action.dueInDays * DAY_MS,
      assignees: [assignee],
      relatedType,
      relatedId: input.candidate.record.id,
      workflow: start.workflow,
      stageId: start.stageId,
      rank: TASK_RANK,
      priority: 'none',
      repeat: 'none',
    },
  })
  return { kind: 'create_task', ok: true, detail: 'Task created.' }
}

async function assignOwnerAction(input: ActionInput & { readonly action: AssignAction }): Promise<ActionOutcome> {
  const collection = OWNER_COLLECTIONS[input.candidate.record.type]
  if (collection === undefined)
    return { kind: 'assign_owner', ok: false, detail: 'Only lead and deal owners can change.' }
  await input.payload.update({
    collection,
    id: input.candidate.record.id,
    data: { owner: input.action.userId },
    overrideAccess: true,
  })
  return { kind: 'assign_owner', ok: true, detail: 'Owner assigned.' }
}

function performAction(input: ActionInput): Promise<ActionOutcome> {
  const { action } = input
  switch (action.kind) {
    case 'notify':
      return notifyAction({ ...input, action })
    case 'create_task':
      return createTaskAction({ ...input, action })
    case 'assign_owner':
      return assignOwnerAction({ ...input, action })
  }
}

function failureDetail(action: RuleAction): string {
  switch (action.kind) {
    case 'notify':
      return 'Could not send the notification.'
    case 'create_task':
      return 'Could not create the task.'
    case 'assign_owner':
      return 'Could not change the owner.'
  }
}

/** Runs one action; a failure becomes a short English detail on the run row, never a raw exception. */
export async function runAction(input: ActionInput): Promise<ActionOutcome> {
  try {
    return await performAction(input)
  } catch (error) {
    console.error('[automation.rules] action failed', {
      kind: input.action.kind,
      error: error instanceof Error ? error.message : String(error),
    })
    return { kind: input.action.kind, ok: false, detail: failureDetail(input.action) }
  }
}
