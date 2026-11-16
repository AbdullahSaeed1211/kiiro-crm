import type { Id } from '@ops/kernel'
import type { Locale } from '../../../i18n/config'

export interface DashboardTask {
  readonly id: Id
  readonly title: string
  readonly updatedAt: number
  readonly dueAt: number | null
  readonly projectId: Id | null
  readonly relatedType: string | null
  readonly relatedId: Id | null
  readonly assigneeIds: readonly string[]
  readonly blockedReason: string | null
  readonly waitingOnId: string | null
  readonly context: string | null
  readonly people: readonly string[]
  readonly isFinished: boolean
}
export interface TaskSection {
  readonly count: number
  readonly items: readonly DashboardTask[]
}
export interface DashboardPlanItem {
  readonly userId: string
  readonly personName: string
  readonly task: DashboardTask
}
export interface DashboardCurrentFocus {
  readonly userId: string
  readonly personName: string
  readonly task: DashboardTask
  readonly startedAt: number
  readonly stale: boolean
}
export interface DashboardPresence {
  readonly userId: string
  readonly personName: string
  readonly lastSeenAt: number
  readonly state: 'active' | 'recent'
}
interface PlanSection {
  readonly count: number
  readonly items: readonly DashboardPlanItem[]
}
export interface DashboardWork {
  readonly actorId: string
  readonly locale: Locale
  readonly timeZone: string
  readonly dayStart: number
  readonly canSeeTeam: boolean
  /** The active queue scope. Team scope is always clamped by the authenticated actor's role. */
  readonly team: boolean
  readonly personFilter: string
  readonly people: readonly { readonly id: string; readonly name: string }[]
  /** Active member names for selecting a person a task is waiting on. */
  readonly taskPeople: readonly { readonly id: string; readonly name: string }[]
  readonly crmEnabled: boolean
  readonly workEnabled: boolean
  readonly overdue: TaskSection
  readonly dueToday: TaskSection
  readonly upcoming: TaskSection
  readonly plan: PlanSection
  readonly planCandidates: TaskSection
  readonly currentFocus: readonly DashboardCurrentFocus[]
  readonly presence: readonly DashboardPresence[]
  readonly refreshedAt: number
}
