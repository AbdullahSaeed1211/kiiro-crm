import type { ActionResult } from '../../../../server/actions/settings'

export interface FieldDefinition {
  id: string
  recordType: string
  key: string
  label: string
  type: string
  required: boolean
  options: string[]
  visibility: string
  sensitive: boolean
  hidden: boolean
  position: number
}

export type ConfigAction = (input: unknown) => Promise<ActionResult>

export const RECORD_TYPES = ['organization', 'contact', 'lead', 'deal', 'project', 'task'] as const
export const TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'select',
  'multiSelect',
  'checkbox',
  'email',
  'url',
] as const

export const capitalize = (value: string) => `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`

export const emptyField = (): FieldDefinition => ({
  id: '',
  recordType: 'contact',
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: [],
  visibility: 'all',
  sensitive: false,
  hidden: false,
  position: 0,
})
