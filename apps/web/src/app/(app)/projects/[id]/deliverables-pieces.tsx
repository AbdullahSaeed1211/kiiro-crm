'use client'

import type { DeliverableRecord } from '@ops/module-work'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { z } from 'zod'
import type { AgencyWorkCopy } from '../../../../i18n/agency-work-copy'

export type DeliverableItem = DeliverableRecord & {
  readonly ownerName: string
  readonly responderName: string | null
  readonly responseDraft?: string
}
export type ResponseStatus = 'sent_to_client' | 'approved' | 'changes_requested'
export interface NewDeliverableInput {
  readonly projectId: string
  readonly title: string
  readonly linkUrl: string | null
  readonly file: File | null
}

type AsyncOutcome = Promise<boolean>

const uploadResponseSchema = z.object({ data: z.object({ id: z.string() }) })

export async function uploadProjectFile(file: File, projectId: string): Promise<string | undefined> {
  const form = new FormData()
  form.set('recordType', 'project')
  form.set('recordId', projectId)
  form.set('file', file)
  const response = await fetch('/api/v1/files', { method: 'POST', body: form })
  const payload = uploadResponseSchema.safeParse(await response.json().catch(() => undefined))
  return response.ok && payload.success ? payload.data.data.id : undefined
}

function statusLabel(item: DeliverableItem, copy: AgencyWorkCopy): string {
  if (item.status === 'approved') return copy.approved
  if (item.status === 'changes_requested') return copy.changesRequested
  if (item.status === 'sent_to_client') return copy.sentToClient
  return copy.draft
}

function responseTimestamp(item: DeliverableItem, locale: string): string {
  if (item.respondedAt === null) return ''
  return new Date(item.respondedAt).toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')
}

function retainedResponseDraft(item: DeliverableItem, copy: AgencyWorkCopy) {
  if (item.status === 'sent_to_client' || !item.responseDraft) return null
  return (
    <p className="mt-2 text-sm text-muted-foreground">
      {copy.responseDraftRetained}: {item.responseDraft}
    </p>
  )
}

function DeliverableDetails({
  item,
  locale,
  copy,
}: Readonly<{ item: DeliverableItem; locale: string; copy: AgencyWorkCopy }>) {
  const responseAt = responseTimestamp(item, locale)
  return (
    <div>
      <h3 className="font-medium">{item.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {statusLabel(item, copy)}
        {item.ownerName ? ` · ${item.ownerName}` : ''}
      </p>
      {item.linkUrl ? (
        <a
          className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
          href={item.linkUrl}
          target="_blank"
          rel="noreferrer"
        >
          {copy.link}
        </a>
      ) : null}
      {item.attachmentId ? (
        <a
          className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
          href={`/api/v1/files/${item.attachmentId}`}
        >
          {copy.file}
        </a>
      ) : null}
      {item.respondedAt !== null ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.responseBy}: {item.responderName ?? ''} · {responseAt}
        </p>
      ) : null}
      {item.responseNote ? <p className="mt-2 text-sm">{item.responseNote}</p> : null}
      {retainedResponseDraft(item, copy)}
    </div>
  )
}

function DeliverableResponseControls({
  item,
  copy,
  pending,
  onResponse,
  note,
  onNoteChange,
}: Readonly<{
  item: DeliverableItem
  copy: AgencyWorkCopy
  pending: boolean
  onResponse: (input: { item: DeliverableItem; status: ResponseStatus; note: string }) => AsyncOutcome
  note: string
  onNoteChange: (note: string) => void
}>) {
  const recordResponse = (status: ResponseStatus) => () => {
    void onResponse({ item, status, note })
  }
  const recordSent = () => {
    void onResponse({ item, status: 'sent_to_client', note: '' })
  }
  return (
    <>
      {item.status === 'sent_to_client' ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            aria-label={copy.response}
            placeholder={`${copy.response} (${copy.optional})`}
            value={note}
            disabled={pending}
            onChange={(event) => {
              onNoteChange(event.target.value)
            }}
            maxLength={5_000}
          />
          <Button variant="outline" size="sm" disabled={pending} onClick={recordResponse('approved')}>
            {copy.approve}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={recordResponse('changes_requested')}>
            {copy.changes}
          </Button>
        </div>
      ) : null}
      {item.status === 'draft' || item.status === 'changes_requested' ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={recordSent}>
          {copy.send}
        </Button>
      ) : null}
    </>
  )
}

export function DeliverableRow({
  item,
  locale,
  copy,
  pending,
  onResponse,
  onResponseNoteChange,
}: Readonly<{
  item: DeliverableItem
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onResponse: (input: { item: DeliverableItem; status: ResponseStatus; note: string }) => AsyncOutcome
  onResponseNoteChange: (deliverableId: string, note: string) => void
}>) {
  const responseDraft = item.responseDraft ?? ''
  return (
    <li className="grid gap-3 rounded-lg border bg-card p-4">
      <DeliverableDetails item={item} locale={locale} copy={copy} />
      <DeliverableResponseControls
        item={item}
        copy={copy}
        pending={pending}
        onResponse={onResponse}
        note={responseDraft}
        onNoteChange={(note) => {
          onResponseNoteChange(item.id, note)
        }}
      />
    </li>
  )
}

export function DeliverablesList({
  items,
  locale,
  copy,
  pending,
  onResponse,
  onResponseNoteChange,
}: Readonly<{
  items: readonly DeliverableItem[]
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onResponse: (input: { item: DeliverableItem; status: ResponseStatus; note: string }) => AsyncOutcome
  onResponseNoteChange: (deliverableId: string, note: string) => void
}>) {
  return items.length === 0 ? (
    <p className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{copy.emptyDeliverables}</p>
  ) : (
    <ul className="grid gap-3">
      {items.map((item) => (
        <DeliverableRow
          key={item.id}
          item={item}
          locale={locale}
          copy={copy}
          pending={pending}
          onResponse={onResponse}
          onResponseNoteChange={onResponseNoteChange}
        />
      ))}
    </ul>
  )
}
