import { sameCalendarDayIn } from '@ops/module-work'
import type { CurrentFocus } from '../../../payload-types'
import type { DashboardWork } from './dashboard-model'

interface FocusRow {
  readonly userId: string
  readonly taskId: string
  readonly startedAt: number
  readonly personName: string
  readonly stale: boolean
}

function relationshipId(value: string | number | { readonly id: string | number }): string {
  return typeof value === 'object' ? String(value.id) : String(value)
}

export function focusRow(
  doc: CurrentFocus,
  scope: Pick<DashboardWork, 'people' | 'actorId' | 'timeZone'>,
  now: number,
): FocusRow[] {
  const userId = relationshipId(doc.user)
  const personName = scope.people.find((person) => person.id === userId)?.name ?? ''
  const today = sameCalendarDayIn({ first: doc.startedAt, second: now, timeZone: scope.timeZone })
  return today || userId === scope.actorId
    ? [{ userId, taskId: relationshipId(doc.task), startedAt: doc.startedAt, personName, stale: !today }]
    : []
}
