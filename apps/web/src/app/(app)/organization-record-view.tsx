import type { OrganizationTab } from '../../server/crm/directory/organizations'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { RecordNotesTab } from './record-notes-tab'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout, type RecordPageTab } from '@ops/ui/composites/RecordPageLayout'
import { UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Outstanding } from '../../server/billing/queries'
import type { OrganizationRecord } from '@ops/module-crm'
import type {
  ActivityItem,
  EmailThreadMessage,
  OrganizationRelations,
  PersonSummary,
  RecordAttachment,
  RelatedTask,
} from '../../server/crm/directory/data'
import type { OrganizationReadiness } from '../../server/crm/directory/organization-readiness'
import { personLabel } from '../../server/crm/directory/data'
import { Activity, DetailCard, Meta, recordTabs } from './record-view-primitives'
import { ArchiveRecordControl } from './archive-record-control'
import { RecordActionLinks } from './record-action-links'
import { RecordCustomFields } from './record-custom-fields'
import { RecordDetails } from './record-details'
import { OrganizationOverview } from './organization-overview'
import { catalogFor } from '../../i18n/locale'
import { RECORD_COPY, type RecordCopy } from '../../i18n/record-copy'
import { ORGANIZATION_OVERVIEW_COPY } from '../../i18n/organization-overview-copy'
import type { OrganizationOverviewCopy } from '../../i18n/organization-overview-copy'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

function organizationTabs(
  input: Readonly<{
    record: OrganizationRecord
    activity: readonly ActivityItem[]
    emailMessages: readonly EmailThreadMessage[]
    relatedTasks: readonly RelatedTask[]
    attachments: readonly RecordAttachment[]
    copy: RecordCopy
    locale: string
    outboundEmailEnabled: boolean
    tab: OrganizationTab
  }>,
) {
  const { record, activity, emailMessages, relatedTasks, attachments, copy, locale, outboundEmailEnabled } = input
  return recordTabs(
    copy,
    locale,
    <Activity entries={activity} recordType="organization" recordId={record.id} copy={copy} />,
    emailMessages,
    {
      recordType: 'organization',
      recordId: record.id,
      notes: input.tab === 'notes' ? <RecordNotesTab recordType="organization" recordId={record.id} /> : null,
      recipient: record.email,
      outboundEmailEnabled,
      tasks: relatedTasks,
      attachments,
    },
  )
}

/** The record's details, its created and updated times, and its custom fields. */
function OrganizationAsideColumn({ record, copy }: Readonly<{ record: OrganizationRecord; copy: RecordCopy }>) {
  return (
    <div className="grid gap-4">
      <RecordDetails type="organization" id={record.id} />
      <OrganizationAside record={record} copy={copy} />
      <RecordCustomFields type="organization" id={record.id} />
    </div>
  )
}

/** Created and updated times. The owner shows once, in the header, rather than again here. */
function OrganizationAside({ record, copy }: Readonly<{ record: OrganizationRecord; copy: RecordCopy }>) {
  return (
    <DetailCard title={copy.record}>
      <Meta createdAt={record.createdAt} updatedAt={record.updatedAt} copy={copy} />
    </DetailCard>
  )
}

function OrganizationOwner({ owner }: Readonly<{ owner: PersonSummary | null }>) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <UsersRound aria-hidden className="size-4" />
      {personLabel(owner)}
    </span>
  )
}

function organizationOverviewTab(
  input: Readonly<{
    organizationId: string
    relations: OrganizationRelations
    nextDueTask: RelatedTask | null
    outstanding?: Outstanding
    readiness: OrganizationReadiness
    copy: RecordCopy
    overviewCopy: OrganizationOverviewCopy
    locale: string
  }>,
) {
  return {
    id: 'overview',
    label: input.copy.tabOverview,
    content: <OrganizationOverview {...input} />,
  }
}

/** The tabs with Billing after Tasks, so work and money sit together. */
function withBilling(
  tabs: readonly RecordPageTab[],
  billing: { label: string; content: ReactNode } | undefined,
): readonly RecordPageTab[] {
  if (billing === undefined) return tabs
  const at = tabs.findIndex((tab) => tab.id === 'tasks') + 1
  return [...tabs.slice(0, at), { id: 'billing', ...billing }, ...tabs.slice(at)]
}

/** Everything the client page shows, with only the open tab's own parts filled in. */
interface OrganizationPageData {
  record: OrganizationRecord
  owner: PersonSummary | null
  relations: OrganizationRelations
  activity: readonly ActivityItem[]
  emailMessages: readonly EmailThreadMessage[]
  relatedTasks: readonly RelatedTask[]
  nextDueTask: RelatedTask | null
  readiness: OrganizationReadiness
  attachments: readonly RecordAttachment[]
}

export async function OrganizationRecordView({
  data,
  outboundEmailEnabled,
  billing,
  outstanding,
  tab,
}: Readonly<{
  data: OrganizationPageData
  outboundEmailEnabled: boolean
  /** The Billing tab, for the people who may see it. */
  billing?: { label: string; content: ReactNode }
  /** What the client owes, for the people who handle billing. */
  outstanding?: Outstanding
  /** The open tab; only its content is built. */
  tab: OrganizationTab
}>) {
  const { record, owner, relations, activity, emailMessages, relatedTasks, nextDueTask, readiness, attachments } = data
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  const overviewCopy = catalogFor(ORGANIZATION_OVERVIEW_COPY, locale)
  const tabs = organizationTabs({
    record,
    activity,
    emailMessages,
    relatedTasks,
    attachments,
    copy,
    locale,
    outboundEmailEnabled,
    tab,
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.organizationsCrumb, href: '/organizations' }]} />
      <PageContent>
        <RecordPageLayout
          className="ops-organization-record"
          serverTabs
          labels={{ breadcrumb: copy.organizationLabel, saveTitle: copy.saveName, cancelTitle: copy.cancel }}
          title={record.name}
          owner={<OrganizationOwner owner={owner} />}
          actions={
            <RecordActionLinks
              copy={copy}
              recordType="organization"
              recordId={record.id}
              recordLabel={record.name}
              archive={<ArchiveRecordControl type="organization" id={record.id} label={record.name} />}
              editHref={`/organizations/${record.id}/edit`}
              primary
              email={record.email}
              phone={record.phone}
              outboundEmailEnabled={outboundEmailEnabled}
            />
          }
          tabs={[
            organizationOverviewTab({
              organizationId: record.id,
              relations,
              nextDueTask,
              ...(outstanding === undefined ? {} : { outstanding }),
              readiness,
              copy,
              overviewCopy,
              locale,
            }),
            ...withBilling(tabs, billing),
          ]}
          aside={<OrganizationAsideColumn record={record} copy={copy} />}
        />
      </PageContent>
    </>
  )
}
