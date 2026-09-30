'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { enableNewsletter, sendNewsletter } from '../../../../server/actions/newsletter'

type Subscriber = Readonly<{ id: string; email: string; name: string }>

type Task = (task: () => Promise<string | null>) => void

/** Runs a server action, shows its message and refreshes the page. */
function useTask(): { run: Task; message: string | null; pending: boolean } {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const run: Task = (task) => {
    startTransition(async () => {
      setMessage(await task())
      router.refresh()
    })
  }
  return { run, message, pending }
}

function EnableNewsletter() {
  const { run, message, pending } = useTask()
  return (
    <div className="grid gap-3 text-sm">
      <p>
        Turn this on to add a "Newsletter subscriber" checkbox to every contact and a "Newsletter opt-in" checkbox to
        every lead. Contacts who are ticked receive the newsletter; when a lead who opted in is converted, its contact
        is ticked. Map a website form question to the lead's opt-in under Settings, Intake.
      </p>
      <Button
        className="w-fit"
        disabled={pending}
        onClick={() => {
          run(async () => {
            const result = await enableNewsletter()
            return result.ok ? null : result.error.message
          })
        }}
      >
        Turn on newsletter
      </Button>
      {message === null ? null : <span role="alert">{message}</span>}
    </div>
  )
}

function Composer({ outboundEnabled, count }: Readonly<{ outboundEnabled: boolean; count: number }>) {
  const { run, message, pending } = useTask()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const incomplete = subject.trim() === '' || body.trim() === ''
  const send = (testOnly: boolean) => {
    run(async () => {
      const result = await sendNewsletter({ subject, body, testOnly })
      return result.ok ? `${String(result.data.sent)} sent, ${String(result.data.failed)} failed` : result.error.message
    })
  }
  return (
    <div className="grid gap-4 text-sm">
      <label className="grid gap-1">
        <span className="font-medium">Subject</span>
        <Input
          value={subject}
          maxLength={200}
          onChange={(event) => {
            setSubject(event.target.value)
          }}
        />
      </label>
      <label className="grid gap-1">
        <span className="font-medium">Message</span>
        <Textarea
          className="min-h-40"
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={pending || !outboundEnabled || incomplete}
          onClick={() => {
            send(true)
          }}
        >
          Send test to me
        </Button>
        <Button
          disabled={pending || !outboundEnabled || count === 0 || incomplete}
          onClick={() => {
            if (window.confirm(`Send to ${String(count)} subscribers?`)) send(false)
          }}
        >
          Send to {count}
        </Button>
        {message === null ? null : (
          <span role="status" className="text-muted-foreground">
            {message}
          </span>
        )}
      </div>
    </div>
  )
}

/** Turns the opt-in field on, or (once on) lists the subscriber count and sends a test or the real campaign. */
export function NewsletterForms({
  enabled,
  outboundEnabled,
  subscribers,
}: Readonly<{ enabled: boolean; outboundEnabled: boolean; subscribers: readonly Subscriber[] }>) {
  if (!enabled) return <EnableNewsletter />
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        <strong>{subscribers.length}</strong> subscriber{subscribers.length === 1 ? '' : 's'}. Tick "Newsletter
        subscriber" on a contact to add them.
      </p>
      {outboundEnabled ? null : <p role="status">Email sending is not available for this workspace.</p>}
      <Composer outboundEnabled={outboundEnabled} count={subscribers.length} />
    </div>
  )
}
