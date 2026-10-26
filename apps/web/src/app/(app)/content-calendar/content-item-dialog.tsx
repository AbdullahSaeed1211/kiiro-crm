'use client'

import { useState, type SubmitEvent } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@ops/ui/components/ui/dialog'
import type { AgencyWorkCopy } from '../../../i18n/agency-work-copy'
import type { ContentItem } from './content-calendar-pieces'
import { preserveUtcTimeOnDate } from './content-types'
import { ContentItemEditForm } from './content-item-edit-form'

type ContentEditorProps = Readonly<{
  item: ContentItem
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    item: ContentItem,
    patch: {
      readonly title: string
      readonly channel: string | null
      readonly publishAt: number | null
      readonly status: ContentItem['status']
    },
  ) => Promise<string | null>
}>

export function ContentItemDialog({
  item,
  locale,
  copy,
  pending,
  onOpenChange,
  onSave,
}: Readonly<{
  item: ContentItem | null
  locale: string
  copy: AgencyWorkCopy
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    item: ContentItem,
    patch: {
      readonly title: string
      readonly channel: string | null
      readonly publishAt: number | null
      readonly status: ContentItem['status']
    },
  ) => Promise<string | null>
}>) {
  if (item === null) return null
  return (
    <ContentItemEditor
      key={item.id}
      item={item}
      locale={locale}
      copy={copy}
      pending={pending}
      onOpenChange={onOpenChange}
      onSave={onSave}
    />
  )
}

function ContentItemEditor({ item, locale, copy, pending, onOpenChange, onSave }: ContentEditorProps) {
  const [title, setTitle] = useState(item.title)
  const [channel, setChannel] = useState(item.channel ?? '')
  const [publishAt, setPublishAt] = useState(item.publishAt)
  const [status, setStatus] = useState(item.status)
  const [error, setError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const effectivePublishAt = preserveUtcTimeOnDate(publishAt, item.publishAt)
  const dirty =
    title !== item.title ||
    (channel.trim() || null) !== item.channel ||
    effectivePublishAt !== item.publishAt ||
    status !== item.status

  function requestClose() {
    if (pending) return
    if (dirty) setConfirmDiscard(true)
    else onOpenChange(false)
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextTitle = title.trim()
    if (nextTitle === '') return
    if (status === 'scheduled' && (channel.trim() === '' || publishAt === null)) {
      setError(copy.scheduleNeedsChannelDate)
      return
    }
    setError('')
    const failure = await onSave(item, {
      title: nextTitle,
      channel: channel.trim() || null,
      publishAt: effectivePublishAt,
      status,
    })
    if (failure !== null) setError(failure)
    else onOpenChange(false)
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
        {confirmDiscard ? (
          <DiscardPrompt
            copy={copy}
            pending={pending}
            onKeepEditing={() => {
              setConfirmDiscard(false)
            }}
            onDiscard={() => {
              onOpenChange(false)
            }}
          />
        ) : (
          <ContentItemEditForm
            item={item}
            locale={locale}
            copy={copy}
            pending={pending}
            title={title}
            setTitle={setTitle}
            channel={channel}
            setChannel={setChannel}
            publishAt={publishAt}
            setPublishAt={setPublishAt}
            status={status}
            setStatus={setStatus}
            error={error}
            onSubmit={(event) => {
              void submit(event)
            }}
            onCancel={requestClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function DiscardPrompt({
  copy,
  pending,
  onKeepEditing,
  onDiscard,
}: Readonly<{ copy: AgencyWorkCopy; pending: boolean; onKeepEditing: () => void; onDiscard: () => void }>) {
  return (
    <>
      <DialogTitle>{copy.unsavedTitle}</DialogTitle>
      <DialogDescription>{copy.unsavedDescription}</DialogDescription>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={onKeepEditing}>
          {copy.keepEditing}
        </Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={onDiscard}>
          {copy.discardChanges}
        </Button>
      </DialogFooter>
    </>
  )
}
