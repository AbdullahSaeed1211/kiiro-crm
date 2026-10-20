'use client'

import { useState, useTransition } from 'react'
import { createDeliverable, respondToDeliverable } from '@/server/actions/work/agency-work'
import { AGENCY_WORK_COPY } from '../../../../i18n/agency-work-copy'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import {
  DeliverableComposer,
  DeliverablesList,
  uploadProjectFile,
  type DeliverableItem,
  type NewDeliverableInput,
  type ResponseStatus,
} from './deliverables-pieces'

export function DeliverablesPanel({
  projectId,
  initialItems,
}: Readonly<{ projectId: string; initialItems: readonly DeliverableItem[] }>) {
  const locale = useLocale()
  const copy = catalogFor(AGENCY_WORK_COPY, locale)
  const [items, setItems] = useState(initialItems)
  const [message, setMessage] = useState('')
  const [pending, startTransition] = useTransition()

  async function saveNew(input: NewDeliverableInput) {
    const attachmentId = input.file === null ? undefined : await uploadProjectFile(input.file, input.projectId)
    if (input.file !== null && attachmentId === undefined) {
      setMessage(copy.saveError)
      return
    }
    const result = await createDeliverable({
      projectId: input.projectId,
      title: input.title,
      linkUrl: input.linkUrl,
      ...(attachmentId === undefined ? {} : { attachmentId }),
    })
    if (!result.ok) {
      setMessage(result.error.message || copy.saveError)
      return
    }
    setItems((current) => [{ ...result.value, ownerName: '', responderName: null }, ...current])
    setMessage('')
  }

  function create(input: NewDeliverableInput) {
    startTransition(() => {
      void saveNew(input)
    })
  }

  async function saveResponse(input: {
    readonly item: DeliverableItem
    readonly status: ResponseStatus
    readonly note: string
  }) {
    const result = await respondToDeliverable({
      deliverableId: input.item.id,
      expectedUpdatedAt: input.item.updatedAt,
      status: input.status,
      responseNote: input.note.trim() || null,
    })
    if (!result.ok) {
      setMessage(result.error.message || copy.saveError)
      return
    }
    const responderName = responseActorName(input.status, locale)
    setItems((current) =>
      current.map((item) => (item.id === input.item.id ? { ...item, ...result.value, responderName } : item)),
    )
    setMessage('')
  }

  function response(input: { readonly item: DeliverableItem; readonly status: ResponseStatus; readonly note: string }) {
    startTransition(() => {
      void saveResponse(input)
    })
  }

  return (
    <div className="grid gap-4">
      <DeliverableComposer projectId={projectId} copy={copy} pending={pending} onCreate={create} />
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
      <DeliverablesList items={items} locale={locale} copy={copy} pending={pending} onResponse={response} />
    </div>
  )
}

function responseActorName(status: ResponseStatus, locale: string): string | null {
  if (status === 'sent_to_client') return null
  return locale === 'es' ? 'Tú' : 'You'
}
