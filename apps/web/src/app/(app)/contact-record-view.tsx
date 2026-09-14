import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { Button } from '@ops/ui/components/ui/button'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { ActivityFeed } from '@ops/ui/composites/ActivityFeed'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { ArrowUpRight, Pencil, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ContactRecord } from '@ops/module-crm'
import type { ActivityItem, ContactRelations, PersonSummary } from '../../server/crm/directory/data'
import { displayName, personLabel } from '../../server/crm/directory/data'
import { hasRelationItems } from '../../server/crm/directory/utils'
import { CopyButton } from './copy-button'

const DATE_FORMAT = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}
function DateCell({ value }: Readonly<{ value: number }>) {
  return (
    <time dateTime={new Date(value).toISOString()} className="tabular-nums text-muted-foreground">
      {DATE_FORMAT.format(value)}
    </time>
  )
}
function Activity({ entries }: Readonly<{ entries: readonly ActivityItem[] }>) {
  return (
    <ActivityFeed
      entries={entries.map((entry) => ({
        id: entry.id,
        occurredAt: entry.occurredAt,
        actorName: entry.actorName,
        summary: entry.summary,
      }))}
      labels={{ heading: 'Activity', empty: 'No activity recorded yet.', loadMore: 'Load more', systemActor: 'System' }}
    />
  )
}
function RelationList({ items, empty }: Readonly<{ items: readonly ReactNode[]; empty: string }>) {
  return (
    <div className="divide-y rounded-lg border">
      {hasRelationItems(items) ? items : <p className="p-4 text-sm text-muted-foreground">{empty}</p>}
    </div>
  )
}
function RelationRow({ href, title }: Readonly<{ href: string; title: string }>) {
  return (
    <a href={href} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/60">
      <span className="truncate font-medium">{title}</span>
      <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
    </a>
  )
}
function DetailCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
function Meta({ record }: Readonly<{ record: ContactRecord }>) {
  return (
    <dl className="grid gap-3 text-sm">
      <div>
        <dt className="text-xs text-muted-foreground">Created</dt>
        <dd>
          <DateCell value={record.createdAt} />
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Last updated</dt>
        <dd>
          <DateCell value={record.updatedAt} />
        </dd>
      </div>
    </dl>
  )
}

function ContactAside({
  record,
  owner,
  relations,
}: Readonly<{ record: ContactRecord; owner: PersonSummary | null; relations: ContactRelations }>) {
  const leadRows = relations.leads.map((lead) => (
    <RelationRow key={lead.id} href={`/leads/${lead.id}`} title={lead.title} />
  ))
  const dealRows = relations.deals.map((deal) => (
    <RelationRow key={deal.id} href={`/deals/${deal.id}`} title={deal.title} />
  ))
  return (
    <div className="space-y-4">
      <DetailCard title="Details">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-0.5 flex items-center justify-between gap-2">
              {record.email === null ? (
                <EmptyValue />
              ) : (
                <>
                  <a href={`mailto:${record.email}`} className="truncate text-primary hover:underline">
                    {record.email}
                  </a>
                  <CopyButton value={record.email} label="email" />
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="mt-0.5 flex items-center justify-between gap-2">
              {record.phone === null ? (
                <EmptyValue />
              ) : (
                <>
                  <a href={`tel:${record.phone}`} className="truncate text-primary hover:underline">
                    {record.phone}
                  </a>
                  <CopyButton value={record.phone} label="phone number" />
                </>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Organization</dt>
            <dd className="mt-0.5">
              {relations.organization === null ? (
                <EmptyValue />
              ) : (
                <a href={`/organizations/${relations.organization.id}`} className="text-primary hover:underline">
                  {relations.organization.name}
                </a>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Owner</dt>
            <dd className="mt-0.5">{personLabel(owner)}</dd>
          </div>
        </dl>
      </DetailCard>
      <DetailCard title={`Leads · ${String(relations.leads.length)}`}>
        <RelationList items={leadRows} empty="No leads linked yet." />
      </DetailCard>
      <DetailCard title={`Deals · ${String(relations.deals.length)}`}>
        <RelationList items={dealRows} empty="No deals linked yet." />
      </DetailCard>
      <DetailCard title="Meta">
        <Meta record={record} />
      </DetailCard>
    </div>
  )
}

export function ContactRecordView({
  data,
}: Readonly<{
  data: {
    record: ContactRecord
    owner: PersonSummary | null
    relations: ContactRelations
    activity: readonly ActivityItem[]
  }
}>) {
  const { record, owner, relations, activity } = data
  const title = displayName(record)
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Contacts', href: '/contacts' }, { label: title }]} />
      <PageContent>
        <RecordPageLayout
          labels={{ breadcrumb: 'Contact', saveTitle: 'Save name', cancelTitle: 'Cancel' }}
          title={title}
          owner={
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound aria-hidden className="size-4" />
              {personLabel(owner)}
            </span>
          }
          actions={
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={`/contacts/${record.id}/edit`}>
                  <Pencil aria-hidden />
                  Edit
                </a>
              }
            >
              Edit
            </Button>
          }
          tabs={[
            { id: 'activity', label: 'Activity', content: <Activity entries={activity} /> },
            {
              id: 'tasks',
              label: 'Tasks',
              disabled: true,
              content: <p className="text-sm text-muted-foreground">Related tasks will appear here.</p>,
            },
            {
              id: 'files',
              label: 'Files',
              disabled: true,
              content: <p className="text-sm text-muted-foreground">Files will appear here.</p>,
            },
          ]}
          aside={<ContactAside record={record} owner={owner} relations={relations} />}
        />
      </PageContent>
    </>
  )
}
