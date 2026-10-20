import { todayAsDueAt, weekEndAfter } from '@ops/module-work'
import type { Where } from 'payload'
import { getWorkspaceSettings } from '../../auth/context'

export type TaskDueFilter = '' | 'overdue' | 'week'

export const parseTaskDue = (value: string | undefined): TaskDueFilter =>
  value === 'overdue' || value === 'week' ? value : ''

/** Calendar dates match Today, including the tenant's week boundary rather than a rolling seven days. */
export async function taskDueWhere(due: TaskDueFilter): Promise<Where> {
  if (due === '') return {}
  const settings = await getWorkspaceSettings()
  const timezone = typeof settings.timezone === 'string' ? settings.timezone : 'UTC'
  const today = todayAsDueAt(Date.now(), timezone)
  if (due === 'overdue') return { dueAt: { less_than: today } }
  const start = settings.weekStartsOn === 0 ? 0 : 1
  const end = weekEndAfter(today, start)
  return { and: [{ dueAt: { greater_than_equal: today } }, { dueAt: { less_than: end } }] }
}
