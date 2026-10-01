'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useState } from 'react'
import { saveWebhooks, testWebhook } from '../../../../server/actions/settings/webhooks'
import { CheckboxGroup } from '../checkbox-group'
import { useSave } from '../sales/use-save'

type Hook = Readonly<{
  id: string
  name: string
  url: string
  secret: string
  events: readonly string[]
  active: boolean
}>

const EVENT_OPTIONS = [
  { id: '*', name: 'Everything' },
  { id: 'record.created', name: 'A record is created' },
  { id: 'stage.changed', name: 'A lead or deal changes stage' },
  { id: 'record.converted', name: 'A lead is converted' },
  { id: 'assignment.changed', name: 'A record is assigned to someone' },
  { id: 'field.changed', name: 'A field is edited' },
  { id: 'comment.added', name: 'A note is added' },
  { id: 'email.sent', name: 'An email is sent' },
  { id: 'email.received', name: 'An email is received' },
  { id: 'record.archived', name: 'A record is archived' },
  { id: 'record.restored', name: 'A record is restored' },
]

function newHook(): Hook {
  const secret = `whsec_${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`
  return { id: crypto.randomUUID(), name: '', url: '', secret, events: ['record.created'], active: true }
}

function TestButton({ id }: Readonly<{ id: string }>) {
  const [result, setResult] = useState<string | null>(null)
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setResult('Sending...')
          void testWebhook({ id }).then((outcome) => {
            setResult(outcome.ok ? outcome.data.message : outcome.error.message)
          })
        }}
      >
        Send test
      </Button>
      {result === null ? null : <span role="status">{result}</span>}
    </>
  )
}

function HookEditor({
  hook,
  onChange,
  onRemove,
}: Readonly<{ hook: Hook; onChange: (next: Hook) => void; onRemove: () => void }>) {
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <Input
        aria-label="Webhook name"
        placeholder="Name, for example Zapier new leads"
        value={hook.name}
        onChange={(event) => {
          onChange({ ...hook, name: event.target.value })
        }}
      />
      <Input
        aria-label="Webhook address"
        placeholder="https://hooks.example.com/..."
        value={hook.url}
        onChange={(event) => {
          onChange({ ...hook, url: event.target.value })
        }}
      />
      <CheckboxGroup
        label="Send when"
        options={EVENT_OPTIONS}
        values={hook.events}
        onChange={(events) => {
          onChange({ ...hook, events })
        }}
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={hook.active}
          onChange={(event) => {
            onChange({ ...hook, active: event.target.checked })
          }}
        />
        Active
      </label>
      <label className="grid gap-1">
        <span className="font-medium">Signing secret</span>
        <Input
          readOnly
          className="font-mono text-xs"
          value={hook.secret}
          onFocus={(event) => {
            event.target.select()
          }}
        />
        <span className="text-muted-foreground">
          Each request carries X-Webhook-Signature: sha256= and the HMAC-SHA256 of "timestamp.body" made with this
          secret. Check it, and reject old timestamps.
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <TestButton id={hook.id} />
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove webhook
        </Button>
      </div>
    </div>
  )
}

/** The owner's list of webhooks: where events go, which ones, and the secret that signs them. */
export function WebhooksForm({ initial }: Readonly<{ initial: readonly Hook[] }>) {
  const [hooks, setHooks] = useState<readonly Hook[]>(initial)
  const { save, message, pending } = useSave(saveWebhooks)
  return (
    <div className="grid gap-3 text-sm">
      <h2 className="font-medium">Webhooks</h2>
      <p className="text-muted-foreground">
        Save a webhook before sending a test. A test sends a webhook.test event and shows what the other system
        answered.
      </p>
      {hooks.map((hook, index) => (
        <HookEditor
          key={hook.id}
          hook={hook}
          onChange={(next) => {
            setHooks(hooks.map((entry, at) => (at === index ? next : entry)))
          }}
          onRemove={() => {
            setHooks(hooks.filter((_, at) => at !== index))
          }}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setHooks([...hooks, newHook()])
          }}
        >
          Add webhook
        </Button>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            save(hooks)
          }}
        >
          Save webhooks
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
