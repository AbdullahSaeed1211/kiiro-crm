import { responseOverdue, type LeadRecord, type LookupRecord } from '@ops/module-crm'
import type { Workflow } from '@ops/platform'
import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { User } from '../../../payload-types'
import { getWorkspaceSettings } from '../../auth/context'
import type { LeadListItem, LeadPerson } from './types'

function stageFor(stages: readonly KanbanStage[], stageId: string): KanbanStage {
  return (
    stages.find((stage) => stage.id === stageId) ?? {
      id: stageId,
      name: 'Unknown stage',
      category: 'open',
      color: 'gray',
    }
  )
}

export function toStages(workflow: {
  readonly stages: readonly {
    id: string
    name: string
    category: KanbanStage['category']
    color: KanbanStage['color']
  }[]
}): KanbanStage[] {
  return workflow.stages.map(({ id, name, category, color }) => ({ id, name, category, color }))
}

export function lookupMap(rows: readonly LookupRecord[]): Map<string, LookupRecord> {
  return new Map(rows.map((row) => [row.id, row]))
}

export function personMap(users: readonly User[]): Map<string, LeadPerson> {
  return new Map(users.map((user) => [user.id, { id: user.id, name: user.name, email: user.email }]))
}

function ownerOf(lead: LeadRecord, people: ReadonlyMap<string, LeadPerson>): LeadPerson | null {
  return lead.ownerId === null ? null : (people.get(lead.ownerId) ?? null)
}

/** Tells whether a lead has waited past the workspace's first-response target while still in the first stage. */
export async function responseCheck(workflow: Workflow | undefined): Promise<(lead: LeadRecord) => boolean> {
  const settings = await getWorkspaceSettings()
  const targetHours = typeof settings.responseTargetHours === 'number' ? settings.responseTargetHours : 0
  const now = Date.now()
  return (lead) =>
    responseOverdue({
      createdAt: lead.createdAt,
      now,
      targetHours,
      inFirstStage: lead.stageId === workflow?.defaultStageId,
    })
}

export function makeListItem(
  input: Readonly<{
    lead: LeadRecord
    stages: readonly KanbanStage[]
    sources: ReadonlyMap<string, LookupRecord>
    people: ReadonlyMap<string, LeadPerson>
    overdue: (lead: LeadRecord) => boolean
  }>,
): LeadListItem {
  const { lead, stages, sources, people, overdue } = input
  return {
    lead,
    stage: stageFor(stages, lead.stageId),
    source: lead.sourceId === null ? null : (sources.get(lead.sourceId) ?? null),
    owner: ownerOf(lead, people),
    responseOverdue: overdue(lead),
  }
}
