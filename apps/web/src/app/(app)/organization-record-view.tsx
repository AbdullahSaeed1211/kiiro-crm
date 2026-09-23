import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { Globe2, UsersRound } from 'lucide-react'
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
import { displayName, personLabel } from '../../server/crm/directory/data'
import { safeExternalHref } from '../../server/crm/directory/utils'
import { Activity, DetailCard, EmptyValue, Meta, recordTabs, RelationList, RelationRow } from './record-view-primitives'
import { RecordActionLinks } from './record-action-links'

function OrganizationAside({ record, owner }: Readonly<{ record: OrganizationRecord; owner: PersonSummary | null }>) {
  const website = record.website === null ? null : safeExternalHref(record.website)
  const phone = record.phone?.trim()
  return (
    <div className="space-y-0">
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
            <dd className="mt-0.5">{phone === undefined || phone === '' ? <EmptyValue /> : phone}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Owner</dt>
            <dd className="mt-0.5">{personLabel(owner)}</dd>
          </div>
        </dl>
      </DetailCard>
      <DetailCard title="Meta">
        <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} />
      </DetailCard>
    </div>
  )
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
      action: null,
      items: relations.projects.map((project) => (
        <RelationRow key={project.id} href={`/projects/${project.id}`} title={project.name} />
      )),
    },
    {
      label: 'Contacts',
      count: relations.contacts.length,
      empty: 'No contacts linked yet.',
      action: (
        <Link
          href={`/contacts/new?organizationId=${encodeURIComponent(organizationId)}`}
          className="-mr-2 inline-flex min-h-8 items-center rounded-sm px-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Add contact
        </Link>
      ),
      items: relations.contacts.map((contact) => (
        <RelationRow
          key={contact.id}
          href={`/contacts/${contact.id}`}
          title={displayName(contact)}
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
    <div className="ops-organization-overview">
      <div className="ops-organization-overview-metrics grid grid-cols-3 border-b">
        {sections.map((section) => (
          <div key={section.label} className="flex flex-col gap-1 px-4 py-3 first:pl-0 last:pr-0">
            <span className="text-xs text-muted-foreground">{section.label}</span>
            <span className="text-xl font-semibold tabular-nums">{section.count}</span>
          </div>
        ))}
      </div>
      <div className="grid gap-x-6 md:grid-cols-2">
        {sections.map((section) => (
          <section key={section.label} className="min-w-0 border-b py-4">
            <div className="mb-1 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{section.label}</h2>
              {section.action}
            </div>
            <RelationList items={section.items} empty={section.empty} />
          </section>
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
  return (
    <>
      <AppHeader breadcrumbs={[{ label: 'Organizations', href: '/organizations' }, { label: record.name }]} />
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
            ...recordTabs(
              <Activity entries={activity} recordType="organization" recordId={record.id} />,
              emailMessages,
              {
                recordType: 'organization',
                recordId: record.id,
                recipient: record.email,
                outboundEmailEnabled,
                tasks: relatedTasks,
                attachments,
              },
            ),
          ]}
          aside={<OrganizationAside record={record} owner={owner} />}
        />
      </PageContent>
    </>
  )
}
