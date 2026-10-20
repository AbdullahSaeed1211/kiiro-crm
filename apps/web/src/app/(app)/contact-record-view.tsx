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
import { ArchiveRecordControl } from './archive-record-control'
import { RecordActionLinks } from './record-action-links'
import { Activity, DetailCard, Meta, recordTabs, RelationList, RelationRow } from './record-view-primitives'
import { RecordCustomFields } from './record-custom-fields'
import { RecordDetails } from './record-details'
import { catalogFor } from '../../i18n/locale'
import { RECORD_COPY, type RecordCopy } from '../../i18n/record-copy'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

function ContactAside({
  record,
  owner,
  relations,
  copy,
}: Readonly<{ record: ContactRecord; owner: PersonSummary | null; relations: ContactRelations; copy: RecordCopy }>) {
  const leadRows = relations.leads.map((lead) => (
    <RelationRow key={lead.id} href={`/leads/${lead.id}`} title={lead.title} />
  ))
  const dealRows = relations.deals.map((deal) => (
    <RelationRow key={deal.id} href={`/deals/${deal.id}`} title={deal.title} />
  ))
  return (
    <div className="space-y-4">
      <DetailCard title={copy.organizationAndOwner}>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{copy.organization}</dt>
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
            <dt className="text-xs text-muted-foreground">{copy.owner}</dt>
            <dd className="mt-0.5">{personLabel(owner)}</dd>
          </div>
        </dl>
      </DetailCard>
      <DetailCard title={`${copy.leads} · ${String(relations.leads.length)}`}>
        <RelationList items={leadRows} empty={copy.noLeadsLinked} />
      </DetailCard>
      <DetailCard title={`${copy.deals} · ${String(relations.deals.length)}`}>
        <RelationList items={dealRows} empty={copy.noDealsLinked} />
      </DetailCard>
      <DetailCard title={copy.meta}>
        <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} copy={copy} />
      </DetailCard>
    </div>
  )
}

export async function ContactRecordView({
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
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  const title = displayName(record)
  const tabs = recordTabs(
    copy,
    locale,
    <Activity entries={activity} recordType="contact" recordId={record.id} copy={copy} />,
    emailMessages,
    {
      recordType: 'contact',
      recordId: record.id,
      notes: <RecordNotesTab recordType="contact" recordId={record.id} />,
      recipient: record.email,
      outboundEmailEnabled,
      tasks: relatedTasks,
      attachments,
    },
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.contactsCrumb, href: '/contacts' }, { label: title }]} />
      <PageContent>
        <RecordPageLayout
          labels={{ breadcrumb: copy.contactLabel, saveTitle: copy.saveName, cancelTitle: copy.cancel }}
          title={title}
          owner={
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound aria-hidden className="size-4" />
              {personLabel(owner)}
            </span>
          }
          actions={
            <RecordActionLinks
              copy={copy}
              recordType="contact"
              recordId={record.id}
              recordLabel={title}
              archive={<ArchiveRecordControl type="contact" id={record.id} label={title} />}
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
              <ContactAside record={record} owner={owner} relations={relations} copy={copy} />
              <RecordCustomFields type="contact" id={record.id} />
            </div>
          }
        />
      </PageContent>
    </>
  )
}
