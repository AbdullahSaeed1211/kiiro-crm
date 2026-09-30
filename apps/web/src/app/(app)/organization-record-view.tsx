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

function OrganizationAside({ record, owner }: Readonly<{ record: OrganizationRecord; owner: PersonSummary | null }>) {
  return (
    <DetailCard title="Record">
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="mt-0.5">{personLabel(owner)}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} />
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
}: Readonly<{ organizationId: string; relations: OrganizationRelations }>) {
  const sections = [
    {
      label: 'Projects',
      count: relations.projects.length,
      empty: 'No projects linked yet.',
      action: <RelatedCreateAction href={getAddProjectHref(organizationId)} label="Add project" />,
      items: relations.projects.map((project) => (
        <RelationRow key={project.id} href={`/projects/${project.id}`} title={project.name} />
      )),
    },
    {
      label: 'Contacts',
      count: relations.contacts.length,
      empty: 'No contacts linked yet.',
      action: <RelatedCreateAction href={getAddContactHref(organizationId)} label="Add contact" />,
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
      label: 'Deals',
      count: relations.deals.length,
      empty: 'No deals linked yet.',
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

export function OrganizationRecordView({
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
  const tabs = recordTabs(
    <Activity entries={activity} recordType="organization" recordId={record.id} />,
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
      <AppHeader breadcrumbs={[{ label: 'Organizations', href: '/organizations' }]} />
      <PageContent>
        <RecordPageLayout
          className="ops-organization-record"
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
              label: 'Overview',
              content: <OrganizationOverview organizationId={record.id} relations={relations} />,
            },
            ...tabs,
          ]}
          aside={
            <div className="grid gap-4">
              <RecordDetails type="organization" id={record.id} />
              <OrganizationAside record={record} owner={owner} />
              <RecordCustomFields type="organization" id={record.id} />
            </div>
          }
        />
      </PageContent>
    </>
  )
}
