import { Button } from '@ops/ui/components/ui/button'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { ListTodo, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardWork } from '../../server/queries/work/dashboard-work'
import type { WorkProfile } from '@ops/platform'

export type HomeProfile = WorkProfile | 'admin'

function canCreateLead(work: DashboardWork, profile: HomeProfile): boolean {
  return work.crmEnabled && (profile === 'admin' || profile === 'sales')
}

export function TodayActions({ work, profile }: Readonly<{ work: DashboardWork; profile: HomeProfile }>) {
  if (profile === 'consultant') return null
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <div className="flex flex-wrap gap-2">
      {profile === 'sales' ? (
        <Button variant="outline" nativeButton={false} render={<Link href="/sales" />}>
          {copy.salesWorkspace}
        </Button>
      ) : null}
      {work.workEnabled ? (
        <Button variant="outline" nativeButton={false} render={<Link href="/tasks/new" />}>
          {copy.newTask}
        </Button>
      ) : null}
      {canCreateLead(work, profile) ? (
        <Button nativeButton={false} render={<Link href="/leads/new" />}>
          {copy.newLead}
        </Button>
      ) : null}
    </div>
  )
}

function emptyStart(work: DashboardWork, profile: HomeProfile) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const leadStart = canCreateLead(work, profile)
  if (profile === 'consultant') {
    return {
      title: copy.consultantEmptyTitle,
      description: copy.consultantEmptyDescription,
      icon: ListTodo,
      action: undefined,
    }
  }
  return {
    title: leadStart ? copy.startTitle : copy.startTaskTitle,
    description: leadStart ? copy.startBody : copy.startTaskBody,
    icon: leadStart ? UserPlus : ListTodo,
    action: (
      <Button nativeButton={false} render={<Link href={leadStart ? '/leads/new' : '/tasks/new'} />}>
        {leadStart ? copy.startLead : copy.startTask}
      </Button>
    ),
  }
}

/** An empty workspace gives the person one useful first step rather than a wall of empty queues. */
export function TodayStart({ work, profile }: Readonly<{ work: DashboardWork; profile: HomeProfile }>) {
  const start = emptyStart(work, profile)
  return (
    <div className="rounded-xl border bg-card py-10 sm:py-16">
      <EmptyState icon={start.icon} title={start.title} description={start.description} action={start.action} />
    </div>
  )
}
