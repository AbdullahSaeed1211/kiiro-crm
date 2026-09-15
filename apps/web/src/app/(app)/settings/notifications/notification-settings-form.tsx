/* eslint-disable max-lines-per-function, max-params */
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'

interface ChannelState {
  inApp: boolean
  email: boolean
}
interface NotificationType {
  id: string
  label: string
  description: string
}
type NotificationAction = (input: unknown) => Promise<ActionResult>

const TYPES: readonly NotificationType[] = [
  { id: 'assigned', label: 'Assigned to you', description: 'A record or task is assigned to you.' },
  { id: 'mentioned', label: 'Mentions', description: 'Someone mentions you in a comment.' },
  { id: 'due_soon', label: 'Due soon', description: 'A task is approaching its due date.' },
  { id: 'overdue', label: 'Overdue', description: 'A task has passed its due date.' },
  { id: 'digest', label: 'Daily digest', description: 'A daily summary of workspace activity.' },
  { id: 'intake_received', label: 'New intake', description: 'A public form receives a submission.' },
  { id: 'email_received', label: 'Record email', description: 'A message arrives for one of your records.' },
  { id: 'invitation_accepted', label: 'Invitation accepted', description: 'A teammate accepts an invitation.' },
  { id: 'stalled', label: 'Stalled records', description: 'A record has not changed for the configured threshold.' },
]

function defaults(source: Readonly<Record<string, unknown>>): Record<string, ChannelState> {
  return Object.fromEntries(
    TYPES.map((type) => {
      const value = source[type.id]
      const row = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
      return [type.id, { inApp: row.inApp !== false, email: row.email === true }]
    }),
  )
}

export function NotificationSettingsForm({
  action,
  channels,
  digestLocalTime,
}: Readonly<{ action: NotificationAction; channels: Readonly<Record<string, unknown>>; digestLocalTime: string }>) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, ChannelState>>(() => defaults(channels))
  const [digest, setDigest] = useState(digestLocalTime)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async () => {
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action({ channels: values, digestLocalTime: digest })
      setMessage(result.ok ? 'Notification preferences saved.' : result.error)
      if (result.ok) router.refresh()
    } catch {
      setMessage('Unable to save preferences. Try again.')
    } finally {
      setPending(false)
    }
  }
  const toggle = (id: string, channel: keyof ChannelState, checked: boolean) => {
    setValues((current) => ({ ...current, [id]: { ...current[id], [channel]: checked } }))
  }
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Notification</th>
              <th className="w-28 p-3 text-center font-medium">In-app</th>
              <th className="w-28 p-3 text-center font-medium">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {TYPES.map((type) => (
              <tr key={type.id}>
                <td className="p-3">
                  <span className="block font-medium">{type.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{type.description}</span>
                </td>
                <td className="p-3 text-center">
                  <input
                    className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="checkbox"
                    aria-label={`${type.label} in-app`}
                    checked={values[type.id].inApp}
                    onChange={(event) => {
                      toggle(type.id, 'inApp', event.target.checked)
                    }}
                    disabled={pending}
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="checkbox"
                    aria-label={`${type.label} email`}
                    checked={values[type.id].email}
                    onChange={(event) => {
                      toggle(type.id, 'email', event.target.checked)
                    }}
                    disabled={pending}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="grid max-w-xs gap-1 text-sm">
        <span className="font-medium">Digest time</span>
        <span className="text-xs text-muted-foreground">Uses the workspace timezone.</span>
        <input
          className="h-10 rounded-md border bg-background px-3"
          type="time"
          name="digestLocalTime"
          value={digest}
          onChange={(event) => {
            setDigest(event.target.value)
          }}
          disabled={pending}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          type="button"
          onClick={() => {
            void save()
          }}
          disabled={pending}
        >
          {pending ? 'Saving…' : 'Save preferences'}
        </button>
        {message ? (
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
