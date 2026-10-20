'use client'

import type { DeliverableRecord } from '@ops/module-work'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRef, useState, type ChangeEvent } from 'react'
import { z } from 'zod'
import type { AgencyWorkCopy } from '../../../../i18n/agency-work-copy'

export type DeliverableItem = DeliverableRecord & { readonly ownerName: string; readonly responderName: string | null }
export type ResponseStatus = 'sent_to_client' | 'approved' | 'changes_requested'
export interface NewDeliverableInput {
  readonly projectId: string
  readonly title: string
  readonly linkUrl: string | null
  readonly file: File | null
}

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

function DeliverableDetails({
  item,
  locale,
  copy,
}: Readonly<{ item: DeliverableItem; locale: string; copy: AgencyWorkCopy }>) {
  const responseAt = responseTimestamp(item, locale)
  return (
    <div>
      <h3 className="font-medium">{item.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
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
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.responseBy}: {item.responderName ?? ''} · {responseAt}
        </p>
      ) : null}
      {item.responseNote ? <p className="mt-2 text-sm">{item.responseNote}</p> : null}
    </div>
  )
}

function DeliverableResponseControls({
  item,
  copy,
  pending,
  onResponse,
}: Readonly<{
  item: DeliverableItem
  copy: AgencyWorkCopy
  pending: boolean
  onResponse: (input: { item: DeliverableItem; status: ResponseStatus; note: string }) => void
}>) {
  const [note, setNote] = useState('')
  const recordResponse = (status: ResponseStatus) => () => {
    onResponse({ item, status, note })
  }
  const recordSent = () => {
    onResponse({ item, status: 'sent_to_client', note: '' })
  }
  return (
    <>
      {item.status === 'sent_to_client' ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            aria-label={copy.response}
            placeholder={`${copy.response} (${copy.optional})`}
            value={note}
            onChange={(event) => {
              setNote(event.target.value)
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

export function DeliverableComposer({
  projectId,
  copy,
  pending,
  onCreate,
}: Readonly<{
  projectId: string
  copy: AgencyWorkCopy
  pending: boolean
  onCreate: (input: NewDeliverableInput) => void
}>) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  function submit() {
    const value = title.trim()
    if (value === '') return
    onCreate({ projectId, title: value, linkUrl: linkUrl.trim() || null, file })
    setTitle('')
    setLinkUrl('')
    setFile(null)
    if (fileInput.current !== null) fileInput.current.value = ''
  }
  return (
    <form
      className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.7fr)_minmax(10rem,0.7fr)_auto]"
      action={submit}
    >
      <label className="grid gap-1.5 text-sm">
        <span>{copy.title}</span>
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
          maxLength={300}
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>
          {copy.link} ({copy.optional})
        </span>
        <Input
          type="url"
          value={linkUrl}
          onChange={(event) => {
            setLinkUrl(event.target.value)
          }}
          maxLength={2_000}
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>{copy.file}</span>
        <Input
          ref={fileInput}
          type="file"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setFile(event.target.files?.[0] ?? null)
          }}
        />
      </label>
      <Button type="submit" className="self-end" size="sm" disabled={pending || title.trim() === ''}>
        {pending ? copy.saving : copy.create}
      </Button>
    </form>
  )
}

export function DeliverableRow({
  item,
  locale,
  copy,
  pending,
  onResponse,
}: Readonly<{
  item: DeliverableItem
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onResponse: (input: { item: DeliverableItem; status: ResponseStatus; note: string }) => void
}>) {
  return (
    <li className="grid gap-3 rounded-lg border bg-card p-4">
      <DeliverableDetails item={item} locale={locale} copy={copy} />
      <DeliverableResponseControls item={item} copy={copy} pending={pending} onResponse={onResponse} />
    </li>
  )
}

export function DeliverablesList({
  items,
  locale,
  copy,
  pending,
  onResponse,
}: Readonly<{
  items: readonly DeliverableItem[]
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onResponse: (input: { item: DeliverableItem; status: ResponseStatus; note: string }) => void
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
        />
      ))}
    </ul>
  )
}
