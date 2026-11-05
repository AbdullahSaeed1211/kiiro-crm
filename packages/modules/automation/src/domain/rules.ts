import { z } from 'zod'

/** The events a rule can listen for. */
export const TRIGGER_KINDS = [
  'lead.created',
  'lead.no_reply',
  'deal.stage_changed',
  'deal.won',
  'deal.lost',
  'task.overdue',
] as const
export type TriggerKind = (typeof TRIGGER_KINDS)[number]

/** Record facts a rule can compare. */
export const CONDITION_FIELDS = ['source', 'owner', 'stage', 'value'] as const
export type ConditionField = (typeof CONDITION_FIELDS)[number]

/** Comparisons; `gte` and `lte` compare the numeric value. */
export const CONDITION_OPS = ['is', 'is_not', 'gte', 'lte'] as const
export type ConditionOp = (typeof CONDITION_OPS)[number]

/** What a rule can do. */
export const ACTION_KINDS = ['create_task', 'assign_owner', 'notify'] as const
export type ActionKind = (typeof ACTION_KINDS)[number]

/** Who owns a task a rule creates. */
export const TASK_ASSIGNEES = ['record_owner', 'me'] as const
export type TaskAssignee = (typeof TASK_ASSIGNEES)[number]

const ref = z.string().trim().min(1).max(64)

const triggerSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('lead.created') }),
  z.strictObject({ kind: z.literal('lead.no_reply'), days: z.number().int().min(1).max(365) }),
  z.strictObject({ kind: z.literal('deal.stage_changed') }),
  z.strictObject({ kind: z.literal('deal.won') }),
  z.strictObject({ kind: z.literal('deal.lost') }),
  z.strictObject({ kind: z.literal('task.overdue') }),
])

const conditionSchema = z
  .strictObject({
    field: z.enum(CONDITION_FIELDS),
    op: z.enum(CONDITION_OPS),
    value: z.union([z.string().trim().max(500), z.number()]),
  })
  .refine((condition) => (condition.op !== 'gte' && condition.op !== 'lte') || condition.field === 'value', {
    message: 'Only value conditions can use gte or lte.',
    path: ['op'],
  })

const taskActionSchema = z.strictObject({
  kind: z.literal('create_task'),
  title: z.string().trim().min(1).max(300),
  dueInDays: z.number().int().min(0).max(365),
  assignee: z.enum(TASK_ASSIGNEES),
})

const assignOwnerActionSchema = z.strictObject({ kind: z.literal('assign_owner'), userId: ref })
const notifyActionSchema = z.strictObject({ kind: z.literal('notify'), userId: ref })

const actionSchema = z.discriminatedUnion('kind', [taskActionSchema, assignOwnerActionSchema, notifyActionSchema])

const ruleSchema = z.strictObject({
  id: ref,
  name: z.string().trim().min(1).max(80),
  enabled: z.boolean(),
  // The save action sets this from the signed-in actor; the client's value is never trusted.
  createdById: z.string().trim().min(1),
  trigger: triggerSchema,
  conditions: z.array(conditionSchema).max(5),
  actions: z.array(actionSchema).min(1).max(5),
})

/** The workspace's automation rules; at most 20 per workspace. */
export const automationRulesSchema = z.array(ruleSchema).max(20)

export type RuleTrigger = z.infer<typeof triggerSchema>
export type RuleCondition = z.infer<typeof conditionSchema>
export type RuleAction = z.infer<typeof actionSchema>
export type AutomationRule = z.infer<typeof ruleSchema>

/** One record the engine found for a trigger, with the facts conditions compare. */
export interface RuleCandidate {
  readonly record: Readonly<{ type: string; id: string }>
  readonly trigger: TriggerKind
  readonly triggerKey: string
  readonly sourceId?: string | null
  readonly ownerId?: string | null
  readonly stageId?: string | null
  readonly valueMinor?: number | null
}

function candidateFact(candidate: RuleCandidate, field: ConditionField): unknown {
  switch (field) {
    case 'source':
      return candidate.sourceId
    case 'owner':
      return candidate.ownerId
    case 'stage':
      return candidate.stageId
    case 'value':
      return candidate.valueMinor
  }
}

function compareNumbers(op: ConditionOp, actual: number, expected: number): boolean {
  switch (op) {
    case 'is':
      return actual === expected
    case 'is_not':
      return actual !== expected
    case 'gte':
      return actual >= expected
    case 'lte':
      return actual <= expected
  }
}

function matchesValue(condition: RuleCondition, actual: number): boolean {
  const expected = Number(condition.value)
  return Number.isFinite(expected) && compareNumbers(condition.op, actual, expected)
}

function matchesText(op: ConditionOp, actual: string, expected: string): boolean {
  switch (op) {
    case 'is':
      return actual === expected
    case 'is_not':
      return actual !== expected
    case 'gte':
    case 'lte':
      return false
  }
}

function matchesCondition(condition: RuleCondition, candidate: RuleCandidate): boolean {
  const actual = candidateFact(candidate, condition.field)
  // A missing fact never matches, not even `is_not`: a rule must not fire on records it cannot see.
  if (actual === null || actual === undefined || actual === '') return false
  if (condition.field === 'value') return typeof actual === 'number' && matchesValue(condition, actual)
  if (typeof actual !== 'string') return false
  return matchesText(condition.op, actual, String(condition.value))
}

/** Whether every condition holds; a rule with no conditions always matches. */
export function matchesConditions(rule: AutomationRule, candidate: RuleCandidate): boolean {
  return rule.conditions.every((condition) => matchesCondition(condition, candidate))
}

/** The identity of one rule acting once on one record at one trigger time. */
export function runKey(rule: AutomationRule, candidate: RuleCandidate): string {
  return `${rule.id}|${candidate.record.type}|${candidate.record.id}|${candidate.triggerKey}`
}

/** Candidates for this rule's trigger whose conditions hold; the caller supplies only this rule's candidates. */
export function planFor(rule: AutomationRule, candidates: readonly RuleCandidate[]): readonly RuleCandidate[] {
  return candidates.filter((candidate) => candidate.trigger === rule.trigger.kind && matchesConditions(rule, candidate))
}
