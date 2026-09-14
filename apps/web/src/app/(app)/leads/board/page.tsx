import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import type { KanbanCard } from '@ops/ui/composites/KanbanBoard'
import type { Metadata } from 'next'
import { listLeads, parseLeadSearch, parseLeadStages } from '../../../../server/crm/leads/queries'
import { LeadBoard } from '../LeadBoard'

export const metadata: Metadata = { title: 'Lead board · Workspace' }
export const dynamic = 'force-dynamic'

export default async function LeadBoardPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const result = await listLeads({ q: parseLeadSearch(params.q), stages: parseLeadStages(params.stage) })
  const cards: KanbanCard[] = result.items.map(({ lead, source, owner }) => ({
    id: lead.id,
    stageId: lead.stageId,
    title: lead.title,
    updatedAt: lead.updatedAt,
    meta: (
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span>{lead.companyName ?? lead.email ?? 'No company'}</span>
        <span>
          {owner?.name ?? 'Unassigned'}
          {source ? ` · ${source.name}` : ''}
        </span>
      </div>
    ),
  }))
  const query = new URLSearchParams()
  if (params.q) query.set('q', Array.isArray(params.q) ? (params.q[0] ?? '') : params.q)
  parseLeadStages(params.stage).forEach((stage) => {
    query.append('stage', stage)
  })
  const queryString = query.toString()
  const tableHref = queryString === '' ? '/leads' : `/leads?${queryString}`
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Leads', href: tableHref }, { label: 'Board' }]} />
      <PageContent>
        <PageHeader
          title="Lead board"
          count={result.total}
          actions={
            <a className="text-sm text-muted-foreground hover:text-foreground" href={tableHref}>
              Table view
            </a>
          }
        />
        <LeadBoard
          stages={result.stages}
          cards={cards}
          lostReasons={result.lostReasons}
          labels={{
            expand: 'Expand {name}',
            collapse: 'Collapse {name}',
            moveTo: 'Move to…',
            moveFailed: 'Could not move the lead',
            conflict: 'Updated by someone else, refreshed',
          }}
        />
      </PageContent>
    </>
  )
}
