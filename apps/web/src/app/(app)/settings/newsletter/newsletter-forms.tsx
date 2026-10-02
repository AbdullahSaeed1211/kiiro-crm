'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { enableNewsletter, sendNewsletter } from '../../../../server/actions/newsletter'
import { AudienceEditor } from './audience-editor'

type Audience = Readonly<{ name: string; count: number }>

type Subscriber = Readonly<{ id: string; email: string; name: string }>
type Campaign = Readonly<{ id: string; subject: string; sentAt: number; recipients: number }>

/** The last few campaigns sent, so nobody sends the same message twice by accident. */
function CampaignHistory({ campaigns }: Readonly<{ campaigns: readonly Campaign[] }>) {
  if (campaigns.length === 0) return null
  return (
    <section aria-label="Recent campaigns" className="grid gap-1 text-sm">
      <h3 className="font-medium">Recent campaigns</h3>
      <ul className="divide-y rounded-md border">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
            <span>{campaign.subject}</span>
            <span className="text-muted-foreground">
              {new Date(campaign.sentAt).toLocaleDateString('en', { dateStyle: 'medium', timeZone: 'UTC' })} ·{' '}
              {campaign.recipients} recipient{campaign.recipients === 1 ? '' : 's'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

type Task = (task: () => Promise<string | null>) => void

/** Runs a server action, shows its message and refreshes the page. */
function useTask(): { run: Task; message: string | null; pending: boolean } {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
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

/** Chooses who a campaign goes to: everyone subscribed, or one audience; hidden until audiences exist. */
function AudienceSelect({
  audiences,
  total,
  value,
  onChange,
}: Readonly<{ audiences: readonly Audience[]; total: number; value: string; onChange: (value: string) => void }>) {
  if (audiences.length === 0) return null
  return (
    <label className="grid gap-1">
      <span className="font-medium">Send to</span>
      <NativeSelect
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
      >
        <option value="">Everyone subscribed ({total})</option>
        {audiences.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.name} ({entry.count})
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

/** How many subscribers a send to this audience reaches; an empty audience means everyone. */
const audienceCount = ({
  audiences,
  total,
  audience,
}: Readonly<{ audiences: readonly Audience[]; total: number; audience: string }>): number =>
  audience === '' ? total : (audiences.find((entry) => entry.name === audience)?.count ?? 0)

const confirmText = (count: number, audience: string): string =>
  audience === '' ? `Send to ${String(count)} subscribers?` : `Send to ${String(count)} subscribers in ${audience}?`

function sentMessage(data: Readonly<{ sent: number; failed: number; waiting: number }>): string {
  const now = `${String(data.sent)} sent, ${String(data.failed)} failed`
  return data.waiting === 0 ? now : `${now}. ${String(data.waiting)} more go out in rounds over the next hours.`
}

function Composer({
  outboundEnabled,
  total,
  audiences,
}: Readonly<{ outboundEnabled: boolean; total: number; audiences: readonly Audience[] }>) {
  const { run, message, pending } = useTask()
  const [audience, setAudience] = useState('')
  const count = audienceCount({ audiences, total, audience })
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const incomplete = subject.trim() === '' || body.trim() === ''
  const send = (testOnly: boolean) => {
    run(async () => {
      const result = await sendNewsletter({ subject, body, testOnly, ...(audience === '' ? {} : { audience }) })
      return result.ok ? sentMessage(result.data) : result.error.message
    })
  }
  return (
    <div className="grid gap-4 text-sm">
      <AudienceSelect audiences={audiences} total={total} value={audience} onChange={setAudience} />
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
            if (window.confirm(confirmText(count, audience))) send(false)
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
  campaigns,
  audiences,
}: Readonly<{
  enabled: boolean
  outboundEnabled: boolean
  subscribers: readonly Subscriber[]
  campaigns: readonly Campaign[]
  audiences: readonly Audience[]
}>) {
  if (!enabled) return <EnableNewsletter />
  return (
    <div className="grid gap-4">
      <p className="text-sm">
        <strong>{subscribers.length}</strong> subscriber{subscribers.length === 1 ? '' : 's'}. Tick "Newsletter
        subscriber" on a contact to add them.
      </p>
      {outboundEnabled ? null : <p role="status">Email sending is not available for this workspace.</p>}
      <AudienceEditor names={audiences.map((audience) => audience.name)} />
      <Composer outboundEnabled={outboundEnabled} total={subscribers.length} audiences={audiences} />
      <CampaignHistory campaigns={campaigns} />
    </div>
  )
}
