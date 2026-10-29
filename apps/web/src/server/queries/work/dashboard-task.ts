import { asId, type Id } from '@ops/kernel'
import type { DashboardTask } from './dashboard-model'

const relation = (value: unknown): Id | null => (typeof value === 'string' ? asId(value) : null)

export function dashboardTask(
  doc: {
    id: string
    title: string
    stageId?: string | null
    updatedAt: string
    dueAt?: number | null
    project?: unknown
    relatedType?: string | null
    relatedId?: unknown
    assignees?: unknown
  },
  finishedStages: readonly string[],
): DashboardTask {
  const assignees = Array.isArray(doc.assignees)
    ? doc.assignees.filter((id): id is string => typeof id === 'string')
    : []
  return {
    id: asId(doc.id),
    title: doc.title,
    isFinished: finishedStages.includes(doc.stageId ?? ''),
    updatedAt: Date.parse(doc.updatedAt),
    dueAt: doc.dueAt ?? null,
    projectId: relation(doc.project),
    relatedType: doc.relatedType ?? null,
    relatedId: relation(doc.relatedId),
    assigneeIds: assignees,
    context: null,
    people: [],
  }
}
