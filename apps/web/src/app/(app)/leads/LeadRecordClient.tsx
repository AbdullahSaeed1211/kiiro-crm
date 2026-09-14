'use client'

import { ActivityFeed, RecordPageLayout, StageSelect, type ActivityEntry } from '@ops/ui'
import { Avatar, AvatarFallback } from '@ops/ui/components/ui/avatar'
import { Button } from '@ops/ui/components/ui/button'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { moveLead, updateLead } from '../../../server/crm/leads/actions'
import type { LeadPageData } from '../../../server/crm/leads/types'
import { ConvertDialog, LostDialog } from './LeadDialogs'

function formatDate(value: number): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(value)
}

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

function LeadStatusBanners({ data }: Readonly<{ data: LeadPageData }>) {
  const lead = data.item.lead
  if (lead.convertedAt !== null)
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
        Converted {formatDate(lead.convertedAt)}
      </p>
    )
  if (data.item.stage.category === 'done_failure')
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
        Lost{lead.lostNote ? `: ${lead.lostNote}` : ''}
      </p>
    )
  return null
}

function LeadAside({ data }: Readonly<{ data: LeadPageData }>) {
  const lead = data.item.lead
  const details = [
    ['Email', optionalValue(lead.email)],
    ['Phone', optionalValue(lead.phone)],
    ['Company', optionalValue(lead.companyName)],
    ['Source', optionalValue(data.item.source?.name ?? null)],
  ] as const
  const meta = [
    ['Created', formatDate(lead.createdAt)],
    ['Updated', formatDate(lead.updatedAt)],
    ['Stage entered', formatDate(lead.stageEnteredAt)],
  ] as const
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Details</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          {details.map(([label, value]) => (
            <AsideField key={label} label={label} value={value} />
          ))}
        </dl>
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Meta</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          {meta.map(([label, value]) => (
            <AsideField key={label} label={label} value={value} />
          ))}
        </dl>
      </section>
      <LeadStatusBanners data={data} />
    </div>
  )
}

function LeadActions({
  isConverted,
  isTerminal,
  onConvert,
  onLost,
}: Readonly<{ isConverted: boolean; isTerminal: boolean; onConvert: () => void; onLost: () => void }>) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={isConverted || isTerminal} onClick={onConvert}>
        Convert
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={isConverted || isTerminal} onClick={onLost}>
        Mark lost
      </Button>
    </div>
  )
}

function leadTabs(activity: readonly ActivityEntry[]) {
  return [
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <ActivityFeed
          entries={activity}
          labels={{ heading: 'Activity', empty: 'No activity yet', loadMore: 'Load more', systemActor: 'System' }}
          locale="en"
        />
      ),
    },
    {
      id: 'tasks',
      label: 'Tasks',
      content: (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Related tasks will appear here.
        </p>
      ),
    },
    {
      id: 'files',
      label: 'Files',
      content: <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No files attached.</p>,
    },
  ]
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
}: Readonly<{
  data: LeadPageData
  isConverted: boolean
  isTerminal: boolean
  error: string | undefined
  activity: readonly ActivityEntry[]
  onConvert: () => void
  onLost: () => void
  onSaveTitle: (title: string) => void
  onChangeStage: (stageId: string) => void
}>) {
  const lead = data.item.lead
  return (
    <>
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <RecordPageLayout
        labels={{ breadcrumb: 'Breadcrumb', saveTitle: 'Save title', cancelTitle: 'Cancel title' }}
        breadcrumbs={
          <a href="/leads" className="text-sm text-muted-foreground hover:text-foreground">
            Leads
          </a>
        }
        title={lead.title}
        onTitleChange={onSaveTitle}
        stage={
          <StageSelect
            stages={data.stages}
            value={lead.stageId}
            onChange={onChangeStage}
            labels={{ label: 'Stage', terminalGroup: 'Closed', placeholder: 'Select stage' }}
            disabled={isConverted || isTerminal}
          />
        }
        owner={leadOwner(data.item.owner)}
        actions={
          <LeadActions isConverted={isConverted} isTerminal={isTerminal} onConvert={onConvert} onLost={onLost} />
        }
        tabs={leadTabs(activity)}
        aside={<LeadAside data={data} />}
      />
    </>
  )
}

export function LeadRecordClient({ data }: Readonly<{ data: LeadPageData }>) {
  const router = useRouter()
  const [convertOpen, setConvertOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const [actionError, setActionError] = useState<string | undefined>()
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
  const saveTitle = async (title: string) => {
    setActionError(undefined)
    const result = await updateLead({ id: lead.id, expectedUpdatedAt: lead.updatedAt, patch: { title } })
    if (result.ok) router.refresh()
    else {
      setActionError(result.error.message)
      if (result.error.code === 'CONFLICT') router.refresh()
    }
  }
  const changeStage = async (stageId: string) => {
    setActionError(undefined)
    const result = await moveLead({ leadId: lead.id, toStageId: stageId, expectedUpdatedAt: lead.updatedAt })
    if (result.ok) router.refresh()
    else {
      setActionError(result.error.message)
      if (result.error.code === 'CONFLICT') router.refresh()
    }
  }
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
        onConvert={() => {
          setConvertOpen(true)
        }}
        onLost={() => {
          setLostOpen(true)
        }}
      />
      <ConvertDialog data={data} open={convertOpen} onOpenChange={setConvertOpen} />
      <LostDialog data={data} open={lostOpen} onOpenChange={setLostOpen} />
    </>
  )
}
