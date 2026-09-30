'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { MarkdownLite } from '@ops/ui/composites/Collaboration'
import { formatDate } from '@/i18n/format'
import { NOTES_COPY } from '@/i18n/notes-copy'
import { normalizeLocale, type Locale } from '@/i18n/locale'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { RecordNote } from '../../server/queries/crm/record-notes'

export interface RecordNotesProps {
  readonly recordType: string
  readonly recordId: string
  readonly notes: readonly RecordNote[]
  readonly locale?: Locale
}

function RecordNotesComposer({
  submitting,
  body,
  message,
  onBodyChange,
  onSubmit,
  copy,
}: Readonly<{
  submitting: boolean
  body: string
  message: string | null
  onBodyChange: (value: string) => void
  onSubmit: () => void
  copy: Record<string, string>
}>) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <label htmlFor="record-note" className="text-sm font-medium">
        {copy.addNote}
      </label>
      <Textarea
        id="record-note"
        className="mt-2 min-h-20 resize-y"
        value={body}
        onChange={(event) => {
          onBodyChange(event.target.value)
        }}
        placeholder={copy.placeholder}
        disabled={submitting}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {message ?? copy.mentionHint}
        </span>
        <Button type="button" size="sm" disabled={submitting || body.trim() === ''} onClick={onSubmit}>
          {submitting ? copy.posting : copy.comment}
        </Button>
      </div>
    </div>
  )
}

function RecordNoteItem({
  note,
  canDelete,
  onDelete,
  copy,
}: Readonly<{ note: RecordNote; canDelete: boolean; onDelete: (id: string) => void; copy: Record<string, string> }>) {
  return (
    <div className="space-y-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {note.authorName}
            {' • '}
            <time dateTime={new Date(note.createdAt).toISOString()}>
              {formatDate(note.createdAt, undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}
            </time>
          </p>
        </div>
        {canDelete ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => {
              onDelete(note.id)
            }}
            aria-label={copy.delete}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
      <MarkdownLite source={note.body} />
    </div>
  )
}

async function postNote(context: {
  recordType: string
  recordId: string
  body: string
  copy: Record<string, string>
}): Promise<void> {
  const response = await fetch('/api/v1/comments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ recordType: context.recordType, recordId: context.recordId, body: context.body }),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const errorMsg = typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null
    throw new Error(typeof errorMsg === 'string' ? errorMsg : context.copy.error)
  }
}

async function deleteCommentNote(noteId: string): Promise<void> {
  const response = await fetch(`/api/v1/comments/${noteId}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    throw new Error('Unable to delete note')
  }
}

export function RecordNotes({ recordType, recordId, notes, locale = 'en' }: RecordNotesProps) {
  const normalizedLocale = normalizeLocale(locale)
  const copy = NOTES_COPY[normalizedLocale]
  const [body, setBody] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = () => {
    const trimmed = body.trim()
    if (trimmed === '' || submitting) return
    setSubmitting(true)
    setMessage(null)
    postNote({ recordType, recordId, body: trimmed, copy })
      .then(() => {
        setBody('')
        setMessage('Note added.')
        router.refresh()
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : copy.error
        setMessage(msg)
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handleDelete = (noteId: string) => {
    setDeletingId(noteId)
    setMessage(null)
    deleteCommentNote(noteId)
      .then(() => {
        router.refresh()
      })
      .catch((error: unknown) => {
        const msg = error instanceof Error ? error.message : copy.notFound
        setMessage(msg)
      })
      .finally(() => {
        setDeletingId(null)
      })
  }

  return (
    <div className="space-y-4">
      <RecordNotesComposer
        submitting={submitting}
        body={body}
        message={message}
        onBodyChange={(value) => {
          setBody(value)
          setMessage(null)
        }}
        onSubmit={handleSubmit}
        copy={copy}
      />

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {notes.map((note) => (
            <RecordNoteItem
              key={note.id}
              note={note}
              canDelete={note.canDelete && deletingId !== note.id}
              onDelete={handleDelete}
              copy={copy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
