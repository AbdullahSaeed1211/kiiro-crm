'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@ops/ui/components/ui/button'
import { createDeliverable, respondToDeliverable } from '@/server/actions/work/agency-work'
import { AGENCY_WORK_COPY, type AgencyWorkCopy } from '../../../../i18n/agency-work-copy'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { DeliverableComposer } from './deliverable-composer'
import {
  DeliverablesList,
  uploadProjectFile,
  type DeliverableItem,
  type NewDeliverableInput,
  type ResponseStatus,
} from './deliverables-pieces'

type SaveResult<T> = { readonly value: T } | { readonly error: string; readonly conflict?: boolean }

function whilePending<T>(setPending: (pending: boolean) => void, action: () => Promise<T>): Promise<T> {
  setPending(true)
  return action().finally(() => {
    setPending(false)
  })
}

function useSyncedDeliverables(initialItems: readonly DeliverableItem[]) {
  const [items, setItems] = useState(initialItems)
  useEffect(() => {
    setItems((current) => {
      const drafts = new Map(current.map((item) => [item.id, item.responseDraft ?? '']))
      return initialItems.map((item) => ({ ...item, responseDraft: drafts.get(item.id) ?? '' }))
    })
  }, [initialItems])
  return [items, setItems] as const
}

function DeliverableStatusMessage({
  message,
  hasConflict,
  pending,
  copy,
  onRefresh,
}: Readonly<{
  message: string
  hasConflict: boolean
  pending: boolean
  copy: AgencyWorkCopy
  onRefresh: () => void
}>) {
  if (!message) return null
  return (
    <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <p>{message}</p>
      {hasConflict ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={onRefresh}>
          {copy.refreshStatus}
        </Button>
      ) : null}
    </div>
  )
}

async function createDeliverableRecord(
  input: NewDeliverableInput,
  options: { readonly actorName: string; readonly fallback: string },
): Promise<SaveResult<DeliverableItem>> {
  const { actorName, fallback } = options
  try {
    const attachmentId = input.file === null ? undefined : await uploadProjectFile(input.file, input.projectId)
    if (input.file !== null && attachmentId === undefined) return { error: fallback }
    const result = await createDeliverable({
      projectId: input.projectId,
      title: input.title,
      linkUrl: input.linkUrl,
      ...(attachmentId === undefined ? {} : { attachmentId }),
    })
    if (!result.ok) return { error: result.error.message || fallback }
    return { value: { ...result.value, ownerName: actorName, responderName: null } }
  } catch {
    return { error: fallback }
  }
}

async function updateDeliverableResponse(
  input: { readonly item: DeliverableItem; readonly status: ResponseStatus; readonly note: string },
  options: { readonly actorName: string; readonly copy: AgencyWorkCopy },
): Promise<SaveResult<DeliverableItem>> {
  const { actorName, copy } = options
  try {
    const result = await respondToDeliverable({
      deliverableId: input.item.id,
      expectedUpdatedAt: input.item.updatedAt,
      status: input.status,
      responseNote: input.note.trim() || null,
    })
    if (!result.ok) {
      const conflict = result.error.code === 'CONFLICT'
      return {
        error: conflict ? copy.deliverableConflict : result.error.message || copy.saveError,
        conflict,
      }
    }
    return {
      value: {
        ...result.value,
        ownerName: input.item.ownerName,
        responderName: input.status === 'sent_to_client' ? null : actorName,
      },
    }
  } catch {
    return { error: copy.saveError }
  }
}

export function DeliverablesPanel({
  projectId,
  currentActorName,
  initialItems,
}: Readonly<{ projectId: string; currentActorName: string; initialItems: readonly DeliverableItem[] }>) {
  const locale = useLocale()
  const router = useRouter()
  const copy = catalogFor(AGENCY_WORK_COPY, locale)
  const [items, setItems] = useSyncedDeliverables(initialItems)
  const [message, setMessage] = useState('')
  const [conflictedDeliverableId, setConflictedDeliverableId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setMessage('')
    setConflictedDeliverableId(null)
  }, [initialItems])

  async function saveNew(input: NewDeliverableInput): Promise<boolean> {
    const saved = await createDeliverableRecord(input, { actorName: currentActorName, fallback: copy.saveError })
    if ('value' in saved) setItems((current) => [saved.value, ...current])
    setMessage('error' in saved ? saved.error : '')
    return 'value' in saved
  }

  const create = (input: NewDeliverableInput) => whilePending(setPending, () => saveNew(input))

  async function saveResponse(input: {
    readonly item: DeliverableItem
    readonly status: ResponseStatus
    readonly note: string
  }): Promise<boolean> {
    const saved = await updateDeliverableResponse(input, { actorName: currentActorName, copy })
    if ('value' in saved) {
      setItems((current) =>
        current.map((item) => (item.id === input.item.id ? { ...saved.value, responseDraft: '' } : item)),
      )
      setConflictedDeliverableId(null)
    } else if (saved.conflict === true) {
      setConflictedDeliverableId(input.item.id)
    }
    setMessage('error' in saved ? saved.error : '')
    return 'value' in saved
  }

  const response = (input: {
    readonly item: DeliverableItem
    readonly status: ResponseStatus
    readonly note: string
  }) => whilePending(setPending, () => saveResponse(input))

  function updateResponseNote(deliverableId: string, note: string) {
    setItems((current) => current.map((item) => (item.id === deliverableId ? { ...item, responseDraft: note } : item)))
  }

  return (
    <div className="grid gap-4">
      <DeliverableComposer projectId={projectId} copy={copy} pending={pending} onCreate={create} />
      <DeliverableStatusMessage
        message={message}
        hasConflict={conflictedDeliverableId !== null}
        pending={pending}
        copy={copy}
        onRefresh={() => {
          router.refresh()
        }}
      />
      <DeliverablesList
        items={items}
        locale={locale}
        copy={copy}
        pending={pending}
        onResponseNoteChange={updateResponseNote}
        onResponse={response}
      />
    </div>
  )
}
