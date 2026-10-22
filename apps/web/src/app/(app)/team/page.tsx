import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { TEAM_ASSIGNMENTS_COPY } from '../../../i18n/team-assignments-copy'
import { getRequestContext } from '@/server/container'
import { loadTeamAssignments } from '../../../server/queries/work/team-assignments'
import { TeamAssignmentsView } from './team-assignments-view'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Team assignments' }

/** Read-only team work overview for owners and managers. */
export default async function TeamAssignmentsPage() {
  const context = await getRequestContext()
  const model = await loadTeamAssignments(context)
  if (model === undefined) notFound()
  const copy = TEAM_ASSIGNMENTS_COPY[model.locale]
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.title }]} />
      <PageContent>
        <PageHeader title={copy.title} count={model.members.length} description={copy.description} />
        <div className="mt-5">
          <TeamAssignmentsView
            locale={model.locale}
            members={model.members}
            unassignedTasks={model.unassignedTasks}
            ownerGapProjects={model.ownerGapProjects}
          />
        </div>
      </PageContent>
    </>
  )
}
