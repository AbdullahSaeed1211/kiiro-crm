import { AppHeader } from '@ops/ui/composites/AppHeader'
import { RecordNotesTab } from './record-notes-tab'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { UsersRound } from 'lucide-react'
import Link from 'next/link'
import type { OrganizationRecord } from '@ops/module-crm'
import type {
  ActivityItem,
  EmailThreadMessage,
  OrganizationRelations,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from '../../server/crm/directory/data'
import { personLabel } from '../../server/crm/directory/data'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@ops/ui/components/ui/card'
import { Activity, DetailCard, Meta, recordTabs, RelationList, RelationRow } from './record-view-primitives'
import { ArchiveRecordControl } from './archive-record-control'
import { RecordActionLinks } from './record-action-links'
import { RecordCustomFields } from './record-custom-fields'
import { RecordDetails } from './record-details'
import { catalogFor } from '../../i18n/locale'
import { RECORD_COPY, type RecordCopy } from '../../i18n/record-copy'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

function OrganizationAside({
  record,
  owner,
  copy,
}: Readonly<{ record: OrganizationRecord; owner: PersonSummary | null; copy: RecordCopy }>) {
  return (
    <DetailCard title={copy.record}>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{copy.owner}</dt>
          <dd className="mt-0.5">{personLabel(owner)}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} copy={copy} />
      </div>
    </DetailCard>
  )
}

function RelatedCreateAction({ href, label }: Readonly<{ href: string; label: string }>) {
  return (
    <Link
      href={href}
      className="-mr-2 inline-flex min-h-8 items-center rounded-sm px-2 text-sm font-medium ops-brand-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  )
}

function getContactTitle(contact: { firstName: string; lastName: string | null }): string {
  const lastName = contact.lastName ? ` ${contact.lastName}` : ''
  return `${contact.firstName}${lastName}`
}

function getAddProjectHref(organizationId: string): string {
  return `/projects/new?organizationId=${encodeURIComponent(organizationId)}`
}

function getAddContactHref(organizationId: string): string {
  return `/contacts/new?organizationId=${encodeURIComponent(organizationId)}`
}

function OrganizationOverview({
  organizationId,
  relations,
  copy,
}: Readonly<{ organizationId: string; relations: OrganizationRelations; copy: RecordCopy }>) {
  const sections = [
    {
      label: copy.projects,
      count: relations.projects.length,
      empty: copy.noProjectsLinked,
      action: <RelatedCreateAction href={getAddProjectHref(organizationId)} label={copy.addProject} />,
      items: relations.projects.map((project) => (
        <RelationRow key={project.id} href={`/projects/${project.id}`} title={project.name} />
      )),
    },
    {
      label: copy.contacts,
      count: relations.contacts.length,
      empty: copy.noContactsLinked,
      action: <RelatedCreateAction href={getAddContactHref(organizationId)} label={copy.addContact} />,
      items: relations.contacts.map((contact) => (
        <RelationRow
          key={contact.id}
          href={`/contacts/${contact.id}`}
          title={getContactTitle(contact)}
          detail={contact.email ?? undefined}
        />
      )),
    },
    {
      label: copy.deals,
      count: relations.deals.length,
      empty: copy.noDealsLinked,
      action: null,
      items: relations.deals.map((deal) => <RelationRow key={deal.id} href={`/deals/${deal.id}`} title={deal.title} />),
    },
  ] as const
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.label} size="sm" className="min-w-0">
            <CardHeader>
              <CardTitle>
                {section.label} <span className="font-normal text-muted-foreground tabular-nums">{section.count}</span>
              </CardTitle>
              {section.action === null ? null : <CardAction>{section.action}</CardAction>}
            </CardHeader>
            <CardContent>
              <RelationList bare items={section.items} empty={section.empty} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export async function OrganizationRecordView({
  data,
  outboundEmailEnabled,
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
  outboundEmailEnabled: boolean
}>) {
  const { record, owner, relations, activity, emailMessages, relatedTasks, attachments } = data
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  const tabs = recordTabs(
    copy,
    locale,
    <Activity entries={activity} recordType="organization" recordId={record.id} copy={copy} />,
    emailMessages,
    {
      recordType: 'organization',
      recordId: record.id,
      notes: <RecordNotesTab recordType="organization" recordId={record.id} />,
      recipient: record.email,
      outboundEmailEnabled,
      tasks: relatedTasks,
      attachments,
    },
  )
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.organizationsCrumb, href: '/organizations' }]} />
      <PageContent>
        <RecordPageLayout
          className="ops-organization-record"
          labels={{ breadcrumb: copy.organizationLabel, saveTitle: copy.saveName, cancelTitle: copy.cancel }}
          title={record.name}
          owner={
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <UsersRound aria-hidden className="size-4" />
              {personLabel(owner)}
            </span>
          }
          actions={
            <RecordActionLinks
              copy={copy}
              recordType="organization"
              recordId={record.id}
              recordLabel={record.name}
              archive={<ArchiveRecordControl type="organization" id={record.id} label={record.name} />}
              editHref={`/organizations/${record.id}/edit`}
              email={record.email}
              phone={record.phone}
              outboundEmailEnabled={outboundEmailEnabled}
            />
          }
          tabs={[
            {
              id: 'overview',
              label: copy.tabOverview,
              content: <OrganizationOverview organizationId={record.id} relations={relations} copy={copy} />,
            },
            ...tabs,
          ]}
          aside={
            <div className="grid gap-4">
              <RecordDetails type="organization" id={record.id} />
              <OrganizationAside record={record} owner={owner} copy={copy} />
              <RecordCustomFields type="organization" id={record.id} />
            </div>
          }
        />
      </PageContent>
    </>
  )
}
