export interface Stage {
  id: string
  name: string
  category: string
  color: string
  position: number
  probability?: number
}

export interface Workflow {
  id: string
  recordType: string
  name: string
  stages: Stage[]
  defaultStageId: string
}

export type ConfigAction = (input: unknown) => Promise<ActionResult>
export const RECORD_TYPES = ['organization', 'contact', 'lead', 'deal', 'project', 'task'] as const
export const isTerminal = (category: string) => ['done_success', 'done_failure', 'cancelled'].includes(category)
export const title = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
export const newStage = (): Stage => ({
  id: crypto.randomUUID(),
  name: '',
  category: 'open',
  color: 'blue',
  position: 0,
})
import type { ActionResult } from '../../../../server/actions/settings'
