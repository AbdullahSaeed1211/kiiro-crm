import type { UserKey } from './data'

/** A planned client project, owned by the account owner inside the seeded organization. */
export interface ProjectSeed {
  readonly name: string
  readonly previousName?: string
  readonly organizationKey: string
  readonly description: string
  readonly stage: string
  readonly members: readonly UserKey[]
  readonly startDay: number
  readonly targetEndDay: number
}

/** A seeded task; days are offsets from now. */
export interface TaskSeed {
  readonly title: string
  readonly description: string
  readonly previousTitle?: string
  readonly stage: string
  readonly priority: 'none' | 'low' | 'medium' | 'high' | 'urgent'
  readonly assignees: readonly UserKey[]
  readonly group?: string
  readonly project?: string
  readonly startDay: number
  readonly dueDay: number
}
