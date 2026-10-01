'use client'

import { Button } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ops/ui/components/ui/dialog'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { catalogFor } from '../../i18n/locale'
import { useLocale } from '../../i18n/locale-context'
import { SMS_COPY } from '../../i18n/sms-copy'
import { readApi } from './api-client'

const MAX_LENGTH = 480

let textingAvailable: Promise<boolean> | undefined

/** Whether the workspace has text messaging set up; asked once per page load and shared by every Text button. */
function textingIsOn(): Promise<boolean> {
  textingAvailable ??= fetch('/api/v1/sms/send')
    .then(async (response) => {
      const result = await readApi<{ enabled?: boolean }>(response, '')
      return result.ok && result.data.enabled === true
    })
    .catch(() => false)
  return textingAvailable
}

type Sent = Readonly<{ ok: true }> | Readonly<{ ok: false; reason: string | undefined }>

/** Sends the text. When it fails, `reason` is the server's message, if it gave one. */
async function post(input: Readonly<{ recordType: string; recordId: string; body: string }>): Promise<Sent> {
  const response = await fetch('/api/v1/sms/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = await readApi(response, '')
  return result.ok ? { ok: true } : { ok: false, reason: result.message === '' ? undefined : result.message }
}

/** A button and form that texts the phone number on one record, and records the text on it. */
export function SendTextDialog({
  recordType,
  recordId,
  recipient,
}: Readonly<{ recordType: 'contact' | 'lead' | 'organization'; recordId: string; recipient: string }>) {
  const copy = catalogFor(SMS_COPY, useLocale())
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    void textingIsOn().then(setAvailable)
  }, [])
  const send = async () => {
    setPending(true)
    const sent = await post({ recordType, recordId, body })
    setPending(false)
    setProblem(sent.ok ? null : (sent.reason ?? copy.failed))
    if (!sent.ok) return
    setBody('')
    setOpen(false)
    router.refresh()
  }
  if (!available) return null
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <MessageSquare aria-hidden />
            {copy.open}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.to.replace('{phone}', recipient)}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <Textarea
            aria-label={copy.messageLabel}
            value={body}
            maxLength={MAX_LENGTH}
            rows={5}
            onChange={(event) => {
              setBody(event.target.value)
            }}
          />
          <p className="text-xs text-muted-foreground">
            {copy.counter.replace('{used}', String(body.length)).replace('{max}', String(MAX_LENGTH))}
          </p>
          {problem === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || body.trim() === ''}>
              {pending ? copy.sending : copy.send}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
