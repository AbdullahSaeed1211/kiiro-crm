import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { Globe2, UsersRound } from 'lucide-react'
import type { OrganizationRecord } from '@ops/module-crm'
import type {
  ActivityItem,
  EmailThreadMessage,
  OrganizationRelations,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from '../../server/crm/directory/data'
import { displayName, personLabel } from '../../server/crm/directory/data'
import { safeExternalHref } from '../../server/crm/directory/utils'
import { Activity, DetailCard, EmptyValue, Meta, recordTabs, RelationList, RelationRow } from './record-view-primitives'
import { RecordActionLinks } from './record-action-links'

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
              {record.email === null || record.email.trim() === '' ? (
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
        <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} />
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
    emailMessages: readonly EmailThreadMessage[]
    relatedTasks: readonly RelatedTask[]
    attachments: readonly RecordAttachment[]
  }
}>) {
  const { record, owner, relations, activity, emailMessages, relatedTasks, attachments } = data
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
            <RecordActionLinks
              recordType="organization"
              recordId={record.id}
              recordLabel={record.name}
              editHref={`/organizations/${record.id}/edit`}
              email={record.email}
              phone={record.phone}
            />
          }
          tabs={recordTabs(
            <Activity entries={activity} recordType="organization" recordId={record.id} />,
            emailMessages,
            { recordType: 'organization', recordId: record.id, tasks: relatedTasks, attachments },
          )}
          aside={<OrganizationAside record={record} owner={owner} relations={relations} />}
        />
      </PageContent>
    </>
  )
}
