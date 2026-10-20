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
import { listLeads } from '../../../../server/crm/leads/queries'
import type { LeadListItem } from '../../../../server/crm/leads/types'
import { firstParam } from '../../search-params'
import { LeadNextAction } from '../LeadNextAction'
import { leadViews } from '../lead-views'
import { catalogFor } from '../../../../i18n/locale'
import { loadWorkspaceLocale } from '../../../../server/queries/work/read-models'
import { LEAD_FOLLOW_UPS_COPY, type LeadFollowUpsCopy } from '../../../../i18n/lead-follow-ups-copy'
import { LEAD_VIEWS_COPY } from '../../../../i18n/lead-views-copy'

export const metadata: Metadata = { title: 'Lead follow-ups' }
export const dynamic = 'force-dynamic'

function leadScope(params: Record<string, string | string[] | undefined>) {
  return { mine: firstParam(params.owner) === 'me', attention: firstParam(params.attention) === '1' }
}

function ownerHref(mine: boolean, attention: boolean): string {
  const params = new URLSearchParams()
  if (attention) params.set('attention', '1')
  if (!mine) params.set('owner', 'me')
  const query = params.toString()
  return query === '' ? '/leads/follow-ups' : `/leads/follow-ups?${query}`
}

function pageHref({ page, mine, attention }: Readonly<{ page: number; mine: boolean; attention: boolean }>): string {
  const params = new URLSearchParams()
  if (attention) params.set('attention', '1')
  if (mine) params.set('owner', 'me')
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query === '' ? '/leads/follow-ups' : `/leads/follow-ups?${query}`
}

function FollowUpResults({
  result,
  groups,
  copy,
  locale,
  mine,
  attention,
  page,
}: Readonly<{
  result: Awaited<ReturnType<typeof listLeads>>
  groups: Readonly<Record<FollowUpBucket, readonly LeadListItem[]>>
  copy: LeadFollowUpsCopy
  locale: string
  mine: boolean
  attention: boolean
  page: number
}>) {
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize))
  const bucketTitles = {
    overdue: copy.overdue,
    today: copy.today,
    thisWeek: copy.next7Days,
    later: copy.later,
    undated: copy.noNextAction,
  }
  return (
    <>
      {result.total === 0 ? (
        <EmptyState icon={CalendarCheck} title={copy.emptyTitle} description={copy.emptyDescription} />
      ) : (
        <div className="grid gap-4">
          {FOLLOW_UP_BUCKETS.filter((bucket) => groups[bucket].length > 0).map((bucket) => (
            <Card key={bucket} size="sm">
              <CardHeader>
                <CardTitle className={bucket === 'overdue' ? 'text-destructive' : undefined}>
                  {bucketTitles[bucket]}{' '}
                  <span className="font-normal text-muted-foreground tabular-nums">{groups[bucket].length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {groups[bucket].map((item) => (
                    <FollowUpRow key={item.lead.id} item={item} copy={copy} locale={locale} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {result.total > result.pageSize ? (
        <nav aria-label={copy.title} className="flex items-center justify-between gap-3 border-t pt-4 text-sm">
          {page > 1 ? (
            <Link
              href={pageHref({ page: page - 1, mine, attention })}
              className="rounded-md border px-3 py-2 hover:bg-muted"
            >
              {copy.previousPage}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">{copy.pageSummary(page, pageCount)}</span>
          {page < pageCount ? (
            <Link
              href={pageHref({ page: page + 1, mine, attention })}
              className="rounded-md border px-3 py-2 hover:bg-muted"
            >
              {copy.nextPage}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  )
}

function FollowUpRow({
  item,
  copy,
  locale,
}: Readonly<{ item: LeadListItem; copy: LeadFollowUpsCopy; locale: string }>) {
  const { lead, stage, owner } = item
  return (
    <li className="grid items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_12rem_14rem]">
      <div className="min-w-0">
        <Link href={`/leads/${lead.id}`} className="block truncate font-medium hover:underline">
          {lead.title}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">
          {lead.companyName ?? lead.email ?? copy.noCompany} · {owner?.name ?? copy.unassigned}
        </span>
      </div>
      <StagePill name={stage.name} color={stage.color} size="sm" />
      <LeadNextAction
        leadId={lead.id}
        expectedUpdatedAt={lead.updatedAt}
        value={lead.nextActionAt}
        disabled={false}
        labels={{
          label: copy.nextAction,
          placeholder: copy.setNextAction,
          clear: copy.clear,
          overdue: copy.overdue,
          locale,
        }}
      />
    </li>
  )
}

/** Open leads grouped by when their next action is due, so the day's follow-ups are one screen. */
export default async function LeadFollowUpsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(LEAD_FOLLOW_UPS_COPY, locale)
  const viewsCopy = catalogFor(LEAD_VIEWS_COPY, locale)
  const params = await searchParams
  const { mine, attention } = leadScope(params)
  const page = Math.max(1, Number(firstParam(params.page)) || 1)
  const result = await listLeads({
    page,
    pageSize: 50,
    ...(mine ? { owner: 'me' } : {}),
    ...(attention ? { attention: true } : {}),
  })
  const groups = groupFollowUps(result.items, {
    day: (item) => item.lead.nextActionAt,
    tiebreak: (item) => item.lead.title,
    now: Date.now(),
  })
  const toggleHref = ownerHref(mine, attention)
  return (
    <>
      <AppHeader
        breadcrumbs={[{ label: locale === 'es' ? 'Prospectos' : 'Leads', href: '/leads' }, { label: copy.title }]}
      />
      <PageContent>
        <PageHeader
          title={copy.title}
          count={result.total}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href={toggleHref} className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                {mine ? copy.showEveryone : copy.onlyMine}
              </Link>
              <ViewSwitcher
                label={viewsCopy.label}
                active="followUps"
                views={leadViews({ tableHref: '/leads', boardHref: '/leads/board', copy: viewsCopy })}
              />
            </div>
          }
        />
        <FollowUpResults
          result={result}
          groups={groups}
          copy={copy}
          locale={locale}
          mine={mine}
          attention={attention}
          page={page}
        />
      </PageContent>
    </>
  )
}
