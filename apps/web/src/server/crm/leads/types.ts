import type { LeadRecord, LookupRecord } from '@ops/module-crm'
import type { KanbanStage } from '@ops/ui/composites/KanbanBoard'
import type { EmailThreadMessage } from '../directory/types'

export interface LeadPerson {
  readonly id: string
  readonly name: string
  readonly email?: string
}

export interface LeadListItem {
  readonly lead: LeadRecord
  readonly stage: KanbanStage
  readonly source: LookupRecord | null
  readonly owner: LeadPerson | null
}

export interface LeadActivityItem {
  readonly id: string
  readonly occurredAt: number
  readonly actorName: string | null
  readonly actorInitials: string | null
  readonly verb: string
  readonly data: Record<string, unknown>
}

export interface LeadPageData {
  readonly item: LeadListItem
  readonly stages: readonly KanbanStage[]
  readonly sources: readonly LookupRecord[]
  readonly lostReasons: readonly LookupRecord[]
  readonly people: readonly LeadPerson[]
  readonly activities: readonly LeadActivityItem[]
  readonly emailMessages: readonly EmailThreadMessage[]
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.slice(0, 1))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function stageFor(stages: readonly KanbanStage[], stageId: string): KanbanStage {
  return (
    stages.find((stage) => stage.id === stageId) ?? {
      id: stageId,
      name: 'Unknown stage',
      category: 'open',
      color: 'gray',
    }
  )
}

export function isTerminalStage(stage: Pick<KanbanStage, 'category'>): boolean {
  return stage.category === 'done_success' || stage.category === 'done_failure' || stage.category === 'cancelled'
}

export function leadStageMoveError(stage: Pick<KanbanStage, 'category'>): string | null {
  if (stage.category === 'done_success') return 'Convert the lead from its record page.'
  if (stage.category === 'done_failure') return 'Choose Mark lost and provide a lost reason.'
  if (stage.category === 'cancelled') return 'Leads cannot be cancelled from the pipeline.'
  return null
}

export function displayName(lead: LeadRecord): string {
  if (lead.title.trim() !== '') return lead.title
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
  return name !== '' ? name : (lead.companyName ?? 'Untitled lead')
}
