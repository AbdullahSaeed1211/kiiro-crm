import { Button } from '@ops/ui/components/ui/button'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { DashboardWork } from '../../server/queries/work/dashboard-work'

export function TodayActions({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <div className="flex flex-wrap gap-2">
      {work.workEnabled ? (
        <Button variant="outline" nativeButton={false} render={<Link href="/tasks/new" />}>
          {copy.newTask}
        </Button>
      ) : null}
      {work.crmEnabled ? (
        <Button nativeButton={false} render={<Link href="/leads/new" />}>
          {copy.newLead}
        </Button>
      ) : null}
    </div>
  )
}

/** An empty workspace gives the person one useful first step rather than a wall of empty queues. */
export function TodayStart({ work }: Readonly<{ work: DashboardWork }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  return (
    <div className="rounded-xl border bg-card py-10 sm:py-16">
      <EmptyState
        icon={UserPlus}
        title={work.crmEnabled ? copy.startTitle : copy.startTaskTitle}
        description={work.crmEnabled ? copy.startBody : copy.startTaskBody}
        action={
          <Button nativeButton={false} render={<Link href={work.crmEnabled ? '/leads/new' : '/tasks/new'} />}>
            {work.crmEnabled ? copy.startLead : copy.startTask}
          </Button>
        }
      />
    </div>
  )
}
