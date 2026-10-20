'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { MailWarning } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { EmailTemplatePicker } from './email-template-picker'
import { readApi } from './api-client'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { RECORD_COPY } from '../../i18n/record-copy'

interface Props {
  readonly recordType: string
  readonly recordId: string
  readonly defaultTo?: string | null
  readonly outboundEmailEnabled?: boolean
}

interface Attachment {
  readonly id: string
  readonly name: string
}

// eslint-disable-next-line complexity, max-lines-per-function -- composer owns validation, upload, send and retry feedback.
export function RecordEmailComposer({ recordType, recordId, defaultTo, outboundEmailEnabled = true }: Props) {
  const copy = catalogFor(RECORD_COPY, useLocale())
  const [to, setTo] = useState(defaultTo ?? '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function upload(file: File): Promise<Attachment> {
    const form = new FormData()
    form.set('recordType', recordType)
    form.set('recordId', recordId)
    form.set('file', file)
    const response = await fetch('/api/v1/files', { method: 'POST', body: form })
    const result = await readApi<{ id?: string | number }>(response, copy.attachFailed)
    if (!result.ok) throw new Error(result.message)
    if (result.data.id === undefined) throw new Error(copy.attachNoId)
    return { id: String(result.data.id), name: file.name }
  }

  // eslint-disable-next-line complexity, max-statements -- one submit flow keeps pending/error/retry state consistent.
  async function submit(): Promise<void> {
    if (pending) return
    const recipient = to.trim()
    const trimmedSubject = subject.trim()
    const trimmedBody = body.trim()
    if (recipient === '' || trimmedSubject === '' || trimmedBody === '') {
      setMessage(copy.messageFieldsRequired)
      return
    }
    if (!window.confirm(copy.confirmSend.replace('{recipient}', recipient))) return
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
      const result = await readApi(response, copy.sendFailed)
      if (!result.ok) throw new Error(result.message)
      setSubject('')
      setBody('')
      setSelectedFile(null)
      if (inputRef.current !== null) inputRef.current.value = ''
      setMessage(copy.messageSent)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.sendFailed)
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

  if (!outboundEmailEnabled)
    return (
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
        <MailWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium text-foreground">{copy.sendingUnavailable}</p>
          <p className="mt-1">{copy.sendingUnavailableBody}</p>
        </div>
      </div>
    )

  return (
    <form
      className="mt-4 rounded-lg border bg-muted/20 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{copy.newMessage}</p>
        <EmailTemplatePicker
          recordType={recordType}
          recordId={recordId}
          disabled={pending}
          onPick={(filled) => {
            setSubject(filled.subject)
            setBody(filled.body)
          }}
        />
      </div>
      <div className="mt-3 grid gap-2">
        <label className="sr-only" htmlFor="email-to">
          {copy.to}
        </label>
        <Input
          id="email-to"
          type="email"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
          }}
          placeholder={copy.to}
          disabled={pending}
        />
        <label className="sr-only" htmlFor="email-subject">
          {copy.subject}
        </label>
        <Input
          id="email-subject"
          value={subject}
          onChange={(event) => {
            setSubject(event.target.value)
          }}
          placeholder={copy.subject}
          disabled={pending}
        />
        <label className="sr-only" htmlFor="email-body">
          {copy.messageLabel}
        </label>
        <Textarea
          id="email-body"
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
          }}
          onKeyDown={onKeyDown}
          placeholder={copy.writeMessage}
          className="min-h-24 resize-y"
          disabled={pending}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex cursor-pointer items-center text-xs font-medium text-muted-foreground hover:text-foreground">
          <span>{pending ? copy.sending : copy.attachFile}</span>
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
          {pending ? copy.sending : copy.send}
        </Button>
      </div>
      {selectedFile === null ? null : (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {copy.attached.replace('{name}', selectedFile.name)}
        </p>
      )}
      {message === null ? (
        <p className="mt-2 text-xs text-muted-foreground">{copy.sendHint}</p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  )
}
