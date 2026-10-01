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

const MAX_LENGTH = 480

let textingAvailable: Promise<boolean> | undefined

/** Whether the workspace has text messaging set up; asked once per page load and shared by every Text button. */
function textingIsOn(): Promise<boolean> {
  textingAvailable ??= fetch('/api/v1/sms/send')
    .then(async (response) => {
      const payload: unknown = await response.json().catch(() => null)
      return typeof payload === 'object' && payload !== null && Reflect.get(payload, 'enabled') === true
    })
    .catch(() => false)
  return textingAvailable
}

async function post(input: Readonly<{ recordType: string; recordId: string; body: string }>): Promise<string | null> {
  const response = await fetch('/api/v1/sms/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (response.ok) return null
  const payload: unknown = await response.json().catch(() => null)
  const error: unknown = typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'error') : undefined
  return typeof error === 'string' ? error : 'Unable to send the text. Try again.'
}

/** A button and form that texts the phone number on one record, and records the text on it. */
export function SendTextDialog({
  recordType,
  recordId,
  recipient,
}: Readonly<{ recordType: 'contact' | 'lead' | 'organization'; recordId: string; recipient: string }>) {
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
    const failure = await post({ recordType, recordId, body })
    setPending(false)
    setProblem(failure)
    if (failure !== null) return
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
            Text
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a text</DialogTitle>
          <DialogDescription>To {recipient}. The text is saved on this record.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void send()
          }}
        >
          <Textarea
            aria-label="Text message"
            value={body}
            maxLength={MAX_LENGTH}
            rows={5}
            onChange={(event) => {
              setBody(event.target.value)
            }}
          />
          <p className="text-xs text-muted-foreground">
            {body.length} of {MAX_LENGTH} characters
          </p>
          {problem === null ? null : (
            <p role="alert" className="text-sm text-destructive">
              {problem}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || body.trim() === ''}>
              {pending ? 'Sending…' : 'Send text'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
