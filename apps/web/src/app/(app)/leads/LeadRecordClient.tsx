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

function LeadAside({ data }: Readonly<{ data: LeadPageData }>) {
  const lead = data.item.lead
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Details</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-1">{lead.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="mt-1">{lead.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Company</dt>
            <dd className="mt-1">{lead.companyName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="mt-1">{data.item.source?.name ?? '—'}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">Meta</h2>
        <dl className="mt-3 grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-1">{formatDate(lead.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="mt-1">{formatDate(lead.updatedAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Stage entered</dt>
            <dd className="mt-1">{formatDate(lead.stageEnteredAt)}</dd>
          </div>
        </dl>
      </section>
      {lead.convertedAt === null ? null : (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
          Converted {formatDate(lead.convertedAt)}
        </p>
      )}
    </div>
  )
}

function LeadActions({
  isConverted,
  onConvert,
  onLost,
}: Readonly<{ isConverted: boolean; onConvert: () => void; onLost: () => void }>) {
  return (
    <div className="flex gap-2">
      <Button type="button" size="sm" variant="outline" disabled={isConverted} onClick={onConvert}>
        Convert
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={isConverted} onClick={onLost}>
        Mark lost
      </Button>
    </div>
  )
}

function LeadRecordLayout({
  data,
  isConverted,
  activity,
  onConvert,
  onLost,
  onSaveTitle,
  onChangeStage,
}: Readonly<{
  data: LeadPageData
  isConverted: boolean
  activity: readonly ActivityEntry[]
  onConvert: () => void
  onLost: () => void
  onSaveTitle: (title: string) => void
  onChangeStage: (stageId: string) => void
}>) {
  const lead = data.item.lead
  const tabs = [
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
  return (
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
          disabled={isConverted}
        />
      }
      owner={
        data.item.owner ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar size="sm">
              <AvatarFallback>{data.item.owner.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            {data.item.owner.name}
          </span>
        ) : null
      }
      actions={<LeadActions isConverted={isConverted} onConvert={onConvert} onLost={onLost} />}
      tabs={tabs}
      aside={<LeadAside data={data} />}
    />
  )
}

export function LeadRecordClient({ data }: Readonly<{ data: LeadPageData }>) {
  const router = useRouter()
  const [convertOpen, setConvertOpen] = useState(false)
  const [lostOpen, setLostOpen] = useState(false)
  const lead = data.item.lead
  const isConverted = lead.convertedAt !== null
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
    const result = await updateLead({ id: lead.id, expectedUpdatedAt: lead.updatedAt, patch: { title } })
    if (result.ok) router.refresh()
  }
  const changeStage = async (stageId: string) => {
    const result = await moveLead({ leadId: lead.id, toStageId: stageId, expectedUpdatedAt: lead.updatedAt })
    if (result.ok) router.refresh()
  }
  return (
    <>
      <LeadRecordLayout
        data={data}
        isConverted={isConverted}
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
