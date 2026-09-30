import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { StagePill } from '@ops/ui/composites/StagePill'
import { ViewSwitcher } from '@ops/ui/composites/ViewSwitcher'
import { FOLLOW_UP_BUCKETS, groupFollowUps, type FollowUpBucket } from '@ops/module-crm'
import { CalendarCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BOARD_LIMIT } from '../../../../server/crm/board-limit'
import { listLeads } from '../../../../server/crm/leads/queries'
import type { LeadListItem } from '../../../../server/crm/leads/types'
import { firstParam } from '../../search-params'
import { LeadNextAction } from '../LeadNextAction'
import { leadViews } from '../lead-views'

export const metadata: Metadata = { title: 'Lead follow-ups' }
export const dynamic = 'force-dynamic'

const BUCKET_TITLES: Readonly<Record<FollowUpBucket, string>> = {
  overdue: 'Overdue',
  today: 'Today',
  thisWeek: 'Next 7 days',
  later: 'Later',
  undated: 'No next action set',
}

function FollowUpRow({ item }: Readonly<{ item: LeadListItem }>) {
  const { lead, stage, owner } = item
  return (
    <li className="grid items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem]">
      <div className="min-w-0">
        <Link href={`/leads/${lead.id}`} className="block truncate font-medium hover:underline">
          {lead.title}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">
          {lead.companyName ?? lead.email ?? 'No company'} · {owner?.name ?? 'Unassigned'}
        </span>
      </div>
      <StagePill name={stage.name} color={stage.color} size="sm" />
      <LeadNextAction leadId={lead.id} expectedUpdatedAt={lead.updatedAt} value={lead.nextActionAt} disabled={false} />
    </li>
  )
}

/** Open leads grouped by when their next action is due, so the day's follow-ups are one screen. */
export default async function LeadFollowUpsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const mine = firstParam(params.owner) === 'me'
  const result = await listLeads({ pageSize: BOARD_LIMIT, ...(mine ? { owner: 'me' } : {}) })
  const groups = groupFollowUps(result.items, {
    day: (item) => item.lead.nextActionAt,
    tiebreak: (item) => item.lead.title,
    now: Date.now(),
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Leads', href: '/leads' }, { label: 'Follow-ups' }]} />
      <PageContent>
        <PageHeader
          title="Follow-ups"
          count={result.total}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={mine ? '/leads/follow-ups' : '/leads/follow-ups?owner=me'}
                className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                aria-pressed={mine}
              >
                {mine ? 'Showing my leads' : 'Only my leads'}
              </Link>
              <ViewSwitcher
                label="Lead views"
                active="followUps"
                views={leadViews({ tableHref: '/leads', boardHref: '/leads/board' })}
              />
            </div>
          }
        />
        {result.total === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No open leads"
            description="New leads will appear here with their next action."
          />
        ) : (
          <div className="grid gap-4">
            {FOLLOW_UP_BUCKETS.filter((bucket) => groups[bucket].length > 0).map((bucket) => (
              <Card key={bucket} size="sm">
                <CardHeader>
                  <CardTitle className={bucket === 'overdue' ? 'text-destructive' : undefined}>
                    {BUCKET_TITLES[bucket]}{' '}
                    <span className="font-normal text-muted-foreground tabular-nums">{groups[bucket].length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {groups[bucket].map((item) => (
                      <FollowUpRow key={item.lead.id} item={item} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContent>
    </>
  )
}
