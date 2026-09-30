import { EmptyValue } from '@ops/ui/composites/DataTable'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { RecordNotesTab } from './record-notes-tab'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { UsersRound } from 'lucide-react'
import type { ContactRecord } from '@ops/module-crm'
import type {
  ActivityItem,
  ContactRelations,
  EmailThreadMessage,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from '../../server/crm/directory/data'
import { displayName, personLabel } from '../../server/crm/directory/data'
import { RecordActionLinks } from './record-action-links'
import { Activity, DetailCard, Meta, recordTabs, RelationList, RelationRow } from './record-view-primitives'
import { RecordCustomFields } from './record-custom-fields'
import { RecordDetails } from './record-details'

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
            <dt className="text-xs text-muted-foreground">Organization</dt>
            <dd className="mt-0.5">
              {relations.organization === null ? (
                <EmptyValue />
              ) : (
                <a href={`/organizations/${relations.organization.id}`} className="ops-brand-text hover:underline">
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
  outboundEmailEnabled,
}: Readonly<{
  data: {
    record: ContactRecord
    owner: PersonSummary | null
    relations: ContactRelations
    activity: readonly ActivityItem[]
    emailMessages: readonly EmailThreadMessage[]
    relatedTasks: readonly RelatedTask[]
    attachments: readonly RecordAttachment[]
  }
  outboundEmailEnabled: boolean
}>) {
  const { record, owner, relations, activity, emailMessages, relatedTasks, attachments } = data
  const title = displayName(record)
  const tabs = recordTabs(<Activity entries={activity} recordType="contact" recordId={record.id} />, emailMessages, {
    recordType: 'contact',
    recordId: record.id,
    notes: <RecordNotesTab recordType="contact" recordId={record.id} />,
    recipient: record.email,
    outboundEmailEnabled,
    tasks: relatedTasks,
    attachments,
  })
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
              outboundEmailEnabled={outboundEmailEnabled}
            />
          }
          tabs={tabs}
          aside={
            <div className="grid gap-4">
              <RecordDetails type="contact" id={record.id} />
              <ContactAside record={record} owner={owner} relations={relations} />
              <RecordCustomFields type="contact" id={record.id} />
            </div>
          }
        />
      </PageContent>
    </>
  )
}
