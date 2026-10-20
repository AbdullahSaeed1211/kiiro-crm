/* eslint-disable max-lines -- the lead record keeps its action dialogs and layout synchronized in one client boundary. */
'use client'
import { ActivityFeed, RecordPageLayout, StageSelect, type ActivityEntry } from '@ops/ui'
import { Avatar, AvatarFallback } from '@ops/ui/components/ui/avatar'
import { Button } from '@ops/ui/components/ui/button'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, type ReactNode } from 'react'
import { moveLead, updateLead } from '../../../server/crm/leads/actions'
import type { LeadPageData } from '../../../server/crm/leads/types'
import { ConvertDialog, LostDialog } from './LeadDialogs'
import { useVersionedAction } from '../use-versioned-action'
import { LeadNextAction } from './LeadNextAction'
import { RecordActionLinks } from '../record-action-links'
import { recordTabs } from '../record-view-primitives'
import { catalogFor } from '../../../i18n/locale'
import { RECORD_COPY, type RecordCopy } from '../../../i18n/record-copy'
import { formatDate as formatLocaleDate } from '../../../i18n/format'
import { useLocale } from '../../../i18n/locale-context'

const formatDate = (value: number, locale: string): string =>
  formatLocaleDate(value, locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

function AsideField({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  )
}

function optionalValue(value: string | null): string {
  return value ?? '—'
}

function LeadStatusBanners({ data, copy }: Readonly<{ data: LeadPageData; copy: RecordCopy }>) {
  const lead = data.item.lead
  const locale = useLocale()
  if (lead.convertedAt !== null)
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
        {copy.convertedOn.replace('{date}', formatDate(lead.convertedAt, locale))}
        {lead.convertedDealId === null ? null : (
          <>
            {' · '}
            <Link href={`/deals/${lead.convertedDealId}`} className="underline underline-offset-2">
              {copy.openDeal}
            </Link>
          </>
        )}
      </p>
    )
  if (data.item.stage.category === 'done_failure')
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
        {lead.lostNote ? copy.lostWithNote.replace('{note}', lead.lostNote) : copy.lost}
      </p>
    )
  if (data.item.responseOverdue)
    return <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{copy.responseOverdue}</p>
  return null
}

function LeadAside({ data }: Readonly<{ data: LeadPageData }>) {
  const lead = data.item.lead
  const locale = useLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  const details = [[copy.source, optionalValue(data.item.source?.name ?? null)]] as const
  const meta = [
    [copy.created, formatDate(lead.createdAt, locale)],
    [copy.updated, formatDate(lead.updatedAt, locale)],
    [copy.stageEntered, formatDate(lead.stageEnteredAt, locale)],
  ] as const
  return (
    <div className="flex flex-col gap-4">
      <section className="ops-detail-card rounded-lg border p-4">
        <h2 className="text-sm font-medium">{copy.sourceAndNextAction}</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          {details.map(([label, value]) => (
            <AsideField key={label} label={label} value={value} />
          ))}
          <div>
            <dt className="text-muted-foreground">{copy.nextAction}</dt>
            <dd className="mt-1">
              <LeadNextAction
                leadId={lead.id}
                expectedUpdatedAt={lead.updatedAt}
                value={lead.nextActionAt}
                disabled={lead.convertedAt !== null}
              />
            </dd>
          </div>
        </dl>
      </section>
      <section className="ops-detail-card rounded-lg border p-4">
        <h2 className="text-sm font-medium">{copy.meta}</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          {meta.map(([label, value]) => (
            <AsideField key={label} label={label} value={value} />
          ))}
        </dl>
      </section>
      <LeadStatusBanners data={data} copy={copy} />
    </div>
  )
}

function LeadActions({
  isConverted,
  isTerminal,
  onConvert,
  onLost,
  copy,
}: Readonly<{
  isConverted: boolean
  isTerminal: boolean
  onConvert: () => void
  onLost: () => void
  copy: RecordCopy
}>) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={isConverted || isTerminal} onClick={onConvert}>
        {copy.convert}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={isConverted || isTerminal} onClick={onLost}>
        {copy.markLost}
      </Button>
    </div>
  )
}

// eslint-disable-next-line max-params -- tab content needs the record data, activity projection and capability flag.
function leadTabs(
  copy: RecordCopy,
  locale: string,
  data: LeadPageData,
  activity: readonly ActivityEntry[],
  outboundEmailEnabled: boolean,
  notes: ReactNode,
  calls: ReactNode,
) {
  return recordTabs(
    copy,
    locale,
    <ActivityFeed
      entries={activity}
      labels={{
        heading: copy.tabActivity,
        empty: copy.noActivity,
        loadMore: copy.loadMore,
        systemActor: copy.systemActor,
      }}
      locale={locale}
    />,
    data.emailMessages,
    {
      recordType: 'lead',
      recordId: data.item.lead.id,
      notes,
      calls,
      recipient: data.item.lead.email,
      outboundEmailEnabled,
      tasks: data.relatedTasks,
      attachments: data.attachments,
    },
  )
}

function leadOwner(owner: LeadPageData['item']['owner']) {
  return owner === null ? null : (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Avatar size="sm">
        <AvatarFallback>{owner.name.slice(0, 1)}</AvatarFallback>
      </Avatar>
      {owner.name}
    </span>
  )
}

/** Server-rendered sections the page passes in, because they load data with server-only code. */
export type LeadSlots = Readonly<{
  details: ReactNode
  customFields: ReactNode
  notes: ReactNode
  calls: ReactNode
  archive: ReactNode
}>

function LeadError({ message }: Readonly<{ message: string | undefined }>) {
  if (message === undefined) return null
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  )
}

function LeadRecordLayout({
  data,
  isConverted,
  isTerminal,
  error,
  activity,
  onConvert,
  onLost,
  onSaveTitle,
  onChangeStage,
  outboundEmailEnabled,
  slots,
}: Readonly<{
  data: LeadPageData
  slots: LeadSlots
  isConverted: boolean
  isTerminal: boolean
  error: string | undefined
  activity: readonly ActivityEntry[]
  onConvert: () => void
  onLost: () => void
  onSaveTitle: (title: string) => void
  onChangeStage: (stageId: string) => void
  outboundEmailEnabled: boolean
}>) {
  const lead = data.item.lead
  const locale = useLocale()
  const copy = catalogFor(RECORD_COPY, locale)
  return (
    <>
      <LeadError message={error} />
      <RecordPageLayout
        labels={{ breadcrumb: copy.breadcrumb, saveTitle: copy.saveTitle, cancelTitle: copy.cancelTitle }}
        title={lead.title}
        onTitleChange={onSaveTitle}
        stage={
          <StageSelect
            stages={data.stages}
            value={lead.stageId}
            onChange={onChangeStage}
            labels={{ label: copy.stage, terminalGroup: copy.closedGroup, placeholder: copy.selectStage }}
            disabled={isConverted || isTerminal}
          />
        }
        owner={leadOwner(data.item.owner)}
        actions={
          <div className="flex flex-wrap gap-2">
            <RecordActionLinks
              copy={copy}
              recordType="lead"
              recordId={lead.id}
              recordLabel={lead.title}
              archive={slots.archive}
              email={lead.email}
              phone={lead.phone}
              outboundEmailEnabled={outboundEmailEnabled}
            />
            <LeadActions
              isConverted={isConverted}
              isTerminal={isTerminal}
              onConvert={onConvert}
              onLost={onLost}
              copy={copy}
            />
          </div>
        }
        tabs={leadTabs(copy, locale, data, activity, outboundEmailEnabled, slots.notes, slots.calls)}
        aside={
          <div className="grid gap-4">
            {slots.details}
            <LeadAside data={data} />
            {slots.customFields}
          </div>
        }
      />
    </>
  )
}

export function LeadRecordClient({
  data,
  outboundEmailEnabled,
  currency,
  slots,
}: Readonly<{
  data: LeadPageData
  outboundEmailEnabled: boolean
  currency: string
  slots: LeadSlots
}>) {
  // The board sends a card dropped on the converted column here with ?convert=1, so the dialog opens ready.
  const [convertOpen, setConvertOpen] = useState(useSearchParams().get('convert') === '1')
  const [lostOpen, setLostOpen] = useState(false)
  const { run, error: actionError } = useVersionedAction({ refreshOnSuccess: true })
  const lead = data.item.lead
  const isConverted = lead.convertedAt !== null
  const isTerminal = ['done_success', 'done_failure', 'cancelled'].includes(data.item.stage.category)
  const activity: ActivityEntry[] = useMemo(
    () =>
      data.activities.map((entry) => ({
        id: entry.id,
        occurredAt: entry.occurredAt,
        actorName: entry.actorName,
        actorInitials: entry.actorInitials,
        summary: <span>{entry.verb.replaceAll('.', ' ')}</span>,
      })),
    [data.activities],
  )
  const saveTitle = (title: string) =>
    run(() => updateLead({ id: lead.id, expectedUpdatedAt: lead.updatedAt, patch: { title } }))
  const changeStage = (stageId: string) =>
    run(() => moveLead({ leadId: lead.id, toStageId: stageId, expectedUpdatedAt: lead.updatedAt }))
  return (
    <>
      <LeadRecordLayout
        data={data}
        isConverted={isConverted}
        isTerminal={isTerminal}
        error={actionError}
        activity={activity}
        onSaveTitle={(title) => {
          void saveTitle(title)
        }}
        onChangeStage={(stageId) => {
          void changeStage(stageId)
        }}
        outboundEmailEnabled={outboundEmailEnabled}
        slots={slots}
        onConvert={() => {
          setConvertOpen(true)
        }}
        onLost={() => {
          setLostOpen(true)
        }}
      />
      <ConvertDialog data={data} currency={currency} open={convertOpen} onOpenChange={setConvertOpen} />
      <LostDialog data={data} open={lostOpen} onOpenChange={setLostOpen} />
    </>
  )
}
