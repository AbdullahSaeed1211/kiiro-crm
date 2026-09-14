import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { UsersRound } from 'lucide-react'
import type { ContactRecord } from '@ops/module-crm'
import type { ActivityItem, ContactRelations, EmailThreadMessage, PersonSummary } from '../../server/crm/directory/data'
import { displayName, personLabel } from '../../server/crm/directory/data'
import { CopyButton } from './copy-button'
import { RecordActionLinks } from './record-action-links'
import { Activity, DetailCard, EmptyValue, Meta, recordTabs, RelationList, RelationRow } from './record-view-primitives'

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
              {record.email === null || record.email.trim() === '' ? (
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
        <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} />
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
    emailMessages: readonly EmailThreadMessage[]
  }
}>) {
  const { record, owner, relations, activity, emailMessages } = data
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
            <RecordActionLinks
              recordType="contact"
              recordId={record.id}
              recordLabel={title}
              editHref={`/contacts/${record.id}/edit`}
              email={record.email}
              phone={record.phone}
            />
          }
          tabs={recordTabs(<Activity entries={activity} recordType="contact" recordId={record.id} />, emailMessages)}
          aside={<ContactAside record={record} owner={owner} relations={relations} />}
        />
      </PageContent>
    </>
  )
}
