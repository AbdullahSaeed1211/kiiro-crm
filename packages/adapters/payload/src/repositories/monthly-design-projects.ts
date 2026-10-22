import { asId } from '@ops/kernel'
import { monthlyDesignConfigSchema, type MonthlyDesignConfig } from '@ops/module-work'
import { can } from '@ops/platform'
import type { Payload } from 'payload'
import { toActor } from '../access/actor'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, idsOf, type Doc } from './documents'
import type { Workflow } from '@ops/platform'

const TERMINAL_PROJECT_CATEGORIES = new Set(['done_success', 'done_failure', 'cancelled'])

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** Validates legacy custom data before interpreting it as an active monthly-design configuration. */
export function monthlyConfig(doc: Doc): MonthlyDesignConfig | undefined {
  const customData = objectValue(fieldOf(doc, 'customData'))
  const raw = objectValue(customData?.['monthlyDesign'])
  const parsed = raw === undefined ? undefined : monthlyDesignConfigSchema.safeParse(raw)
  return parsed?.success ? { ...parsed.data, assigneeIds: parsed.data.assigneeIds.map(asId) } : undefined
}

export function projectTerminal(doc: Doc, workflows: ReadonlyMap<string, Workflow>): boolean {
  const workflowId = idOf(fieldOf(doc, 'workflow'))
  const stageId = idOf(fieldOf(doc, 'stageId'))
  if (workflowId === undefined || stageId === undefined) return true
  const workflow = workflows.get(String(workflowId))
  const category = workflow?.stages.find((stage) => stage.id === stageId)?.category
  return category === undefined || TERMINAL_PROJECT_CATEGORIES.has(category)
}

/** Confirms configured assignees remain active project members with a work profile that can read project tasks. */
export async function assigneesStillEligible(
  payload: Payload,
  project: Doc,
  config: MonthlyDesignConfig,
): Promise<boolean> {
  const ownerId = idOf(fieldOf(project, 'owner'))
  const memberIds = idsOf(fieldOf(project, 'members'))
  const eligible = new Set([...memberIds, ...(ownerId === undefined ? [] : [ownerId])])
  if (config.assigneeIds.length === 0 || config.assigneeIds.some((id) => !eligible.has(id))) return false
  const active = await payload.find({
    collection: COLLECTIONS.users,
    where: { and: [{ id: { in: [...config.assigneeIds] } }, { active: { equals: true } }] },
    limit: config.assigneeIds.length,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  if (new Set(active.docs.flatMap((person) => idOf(fieldOf(person, 'id')) ?? [])).size !== config.assigneeIds.length)
    return false
  return active.docs.every((person) => {
    const actor = toActor(person)
    return (
      actor !== undefined &&
      can(actor, 'read', {
        type: 'project',
        ...(ownerId === undefined ? {} : { ownerId }),
        assigneeIds: memberIds,
      })
    )
  })
}
