import { Card, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { Button } from '@ops/ui/components/ui/button'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { ActivityFeed } from '@ops/ui/composites/ActivityFeed'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { ArrowUpRight, Globe2, Pencil, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { OrganizationRecord } from '@ops/module-crm'
import type { ActivityItem, OrganizationRelations, PersonSummary } from '../../server/crm/directory/data'
import { displayName, personLabel } from '../../server/crm/directory/data'
import { hasRelationItems, safeExternalHref } from '../../server/crm/directory/utils'

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
function RelationRow({ href, title, detail }: Readonly<{ href: string; title: string; detail?: string }>) {
  return (
    <a href={href} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/60">
      <span className="min-w-0">
        <span className="block truncate font-medium">{title}</span>
        {detail === undefined ? null : <span className="block truncate text-xs text-muted-foreground">{detail}</span>}
      </span>
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
function Meta({ record }: Readonly<{ record: OrganizationRecord }>) {
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

function OrganizationAside({
  record,
  owner,
  relations,
}: Readonly<{ record: OrganizationRecord; owner: PersonSummary | null; relations: OrganizationRelations }>) {
  const website = record.website === null ? null : safeExternalHref(record.website)
  const contactRows = relations.contacts.map((contact) => (
    <RelationRow
      key={contact.id}
      href={`/contacts/${contact.id}`}
      title={displayName(contact)}
      detail={contact.email ?? undefined}
    />
  ))
  const dealRows = relations.deals.map((deal) => (
    <RelationRow key={deal.id} href={`/deals/${deal.id}`} title={deal.title} />
  ))
  const projectRows = relations.projects.map((project) => (
    <RelationRow key={project.id} href={`/projects/${project.id}`} title={project.name} />
  ))
  return (
    <div className="space-y-4">
      <DetailCard title="Details">
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Website</dt>
            <dd className="mt-0.5">
              {website === null ? (
                <EmptyValue />
              ) : (
                <a
                  href={website}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Globe2 aria-hidden className="size-3.5" />
                  {website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="mt-0.5">
              {record.email === null ? (
                <EmptyValue />
              ) : (
                <a href={`mailto:${record.email}`} className="text-primary hover:underline">
                  {record.email}
                </a>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Phone</dt>
            <dd className="mt-0.5">{record.phone ?? <EmptyValue />}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Owner</dt>
            <dd className="mt-0.5">{personLabel(owner)}</dd>
          </div>
        </dl>
      </DetailCard>
      <DetailCard title={`Contacts · ${String(relations.contacts.length)}`}>
        <RelationList items={contactRows} empty="No contacts linked yet." />
      </DetailCard>
      <DetailCard title={`Deals · ${String(relations.deals.length)}`}>
        <RelationList items={dealRows} empty="No deals linked yet." />
      </DetailCard>
      <DetailCard title={`Projects · ${String(relations.projects.length)}`}>
        <RelationList items={projectRows} empty="No projects linked yet." />
      </DetailCard>
      <DetailCard title="Meta">
        <Meta record={record} />
      </DetailCard>
    </div>
  )
}

export function OrganizationRecordView({
  data,
}: Readonly<{
  data: {
    record: OrganizationRecord
    owner: PersonSummary | null
    relations: OrganizationRelations
    activity: readonly ActivityItem[]
  }
}>) {
  const { record, owner, relations, activity } = data
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Organizations', href: '/organizations' }, { label: record.name }]} />
      <PageContent>
        <RecordPageLayout
          labels={{ breadcrumb: 'Organization', saveTitle: 'Save name', cancelTitle: 'Cancel' }}
          title={record.name}
          owner={
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound aria-hidden className="size-4" />
              {personLabel(owner)}
            </span>
          }
          actions={
            <Button
              variant="outline"
              render={
                <a href={`/organizations/${record.id}/edit`}>
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
          aside={<OrganizationAside record={record} owner={owner} relations={relations} />}
        />
      </PageContent>
    </>
  )
}
