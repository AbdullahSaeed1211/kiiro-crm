import { AppHeader } from '@ops/ui/composites/AppHeader'
import { RecordNotesTab } from './record-notes-tab'
import { PageContent } from '@ops/ui/composites/AppShell'
import { RecordPageLayout } from '@ops/ui/composites/RecordPageLayout'
import { UsersRound } from 'lucide-react'
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
import { Activity, DetailCard, Meta, recordTabs } from './record-view-primitives'
import { ArchiveRecordControl } from './archive-record-control'
import { RecordActionLinks } from './record-action-links'
import { RecordCustomFields } from './record-custom-fields'
import { RecordDetails } from './record-details'
import { OrganizationOverview } from './organization-overview'
import { catalogFor } from '../../i18n/locale'
import { RECORD_COPY, type RecordCopy } from '../../i18n/record-copy'
import { DIRECTORY_COPY } from '../../i18n/directory-copy'
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
      notes: <RecordNotesTab recordType="organization" recordId={record.id} />,
      recipient: record.email,
      outboundEmailEnabled,
      tasks: relatedTasks,
      attachments,
    },
  )
}

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
    copy: RecordCopy
    nextDueTaskLabel: string
    locale: string
  }>,
) {
  return {
    id: 'overview',
    label: input.copy.tabOverview,
    content: <OrganizationOverview {...input} />,
  }
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
    nextDueTask: RelatedTask | null
    attachments: readonly RecordAttachment[]
  }
  outboundEmailEnabled: boolean
}>) {
  const { record, owner, relations, activity, emailMessages, relatedTasks, nextDueTask, attachments } = data
  const locale = await loadWorkspaceLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  const directoryCopy = catalogFor(DIRECTORY_COPY, locale)
  const tabs = organizationTabs({
    record,
    activity,
    emailMessages,
    relatedTasks,
    attachments,
    copy,
    locale,
    outboundEmailEnabled,
  })
  return (
    <>
      <AppHeader breadcrumbs={[{ label: copy.organizationsCrumb, href: '/organizations' }]} />
      <PageContent>
        <RecordPageLayout
          className="ops-organization-record"
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
              copy,
              nextDueTaskLabel: directoryCopy.nextDueTask,
              locale,
            }),
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
