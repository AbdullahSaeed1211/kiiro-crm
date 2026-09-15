'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  readonly recordType: string
  readonly recordId: string
  readonly defaultTo?: string | null
}

interface Attachment {
  readonly id: string
  readonly name: string
}

// eslint-disable-next-line complexity, max-lines-per-function -- composer owns validation, upload, send and retry feedback.
export function RecordEmailComposer({ recordType, recordId, defaultTo }: Props) {
  const [to, setTo] = useState(defaultTo ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // eslint-disable-next-line complexity -- maps upload response and validation errors at the transport boundary.
  async function upload(file: File): Promise<Attachment> {
    const form = new FormData()
    form.set('recordType', recordType)
    form.set('recordId', recordId)
    form.set('file', file)
    const response = await fetch('/api/v1/files', { method: 'POST', body: form })
    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const error = typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null
      throw new Error(typeof error === 'string' ? error : 'Unable to upload the attachment.')
    }
    const attachment =
      typeof payload === 'object' && payload !== null && 'attachment' in payload ? payload.attachment : null
    if (typeof attachment !== 'object' || attachment === null || !('id' in attachment))
      throw new Error('Attachment upload returned no id.')
    return { id: String(attachment.id), name: file.name }
  }

  // eslint-disable-next-line complexity, max-statements, sonarjs/cognitive-complexity -- one submit flow keeps pending/error/retry state consistent.
  async function submit(): Promise<void> {
    if (pending) return
    const recipient = to.trim()
    const trimmedSubject = subject.trim()
    const trimmedBody = body.trim()
    if (recipient === '' || trimmedSubject === '' || trimmedBody === '') {
      setMessage('Recipient, subject, and message are required.')
      return
    }
    if (!window.confirm(`Send this message to ${recipient}?`)) return
    setPending(true)
    setMessage(null)
    try {
      const attachmentIds: string[] = []
      const file = inputRef.current?.files?.[0]
      if (file !== undefined) attachmentIds.push((await upload(file)).id)
      const response = await fetch('/api/v1/email/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recordType,
          recordId,
          to: [recipient],
          subject: trimmedSubject,
          textBody: trimmedBody,
          attachmentIds,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const error = typeof payload === 'object' && payload !== null && 'error' in payload ? payload.error : null
        throw new Error(typeof error === 'string' ? error : 'Unable to send the message. Try again.')
      }
      setSubject('')
      setBody('')
      setSelectedFile(null)
      if (inputRef.current !== null) inputRef.current.value = ''
      setMessage('Message sent.')
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send the message. Try again.')
    } finally {
      setPending(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void submit()
    }
  }

  return (
    <form
      className="mt-4 rounded-lg border bg-muted/20 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="text-sm font-medium">New message</p>
      <div className="mt-3 grid gap-2">
        <label className="sr-only" htmlFor="email-to">
          To
        </label>
        <Input
          id="email-to"
          type="email"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
          }}
          placeholder="To"
          disabled={pending}
        />
        <label className="sr-only" htmlFor="email-subject">
          Subject
        </label>
        <Input
          id="email-subject"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value)
          }}
          placeholder="Subject"
          disabled={pending}
        />
        <label className="sr-only" htmlFor="email-body">
          Message
        </label>
        <Textarea
          id="email-body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
          }}
          onKeyDown={onKeyDown}
          placeholder="Write a message…"
          className="min-h-24 resize-y"
          disabled={pending}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center text-xs font-medium text-muted-foreground hover:text-foreground">
          <span>{pending ? 'Sending…' : 'Attach file'}</span>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0]
              setSelectedFile(file ?? null)
            }}
          />
        </label>
        <Button
          type="submit"
          size="sm"
          disabled={pending || to.trim() === '' || subject.trim() === '' || body.trim() === ''}
        >
          {pending ? 'Sending…' : 'Send'}
        </Button>
      </div>
      {selectedFile === null ? null : (
        <p className="mt-2 truncate text-xs text-muted-foreground">Attached: {selectedFile.name}</p>
      )}
      {message === null ? (
        <p className="mt-2 text-[11px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  )
}
