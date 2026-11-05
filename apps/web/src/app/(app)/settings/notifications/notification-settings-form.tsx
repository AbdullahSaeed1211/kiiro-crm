/* eslint-disable max-lines-per-function, max-params -- the settings form owns one authorized save boundary and its channel matrix. */
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'
import { SaveBar } from '../save-bar'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { NOTIFICATION_SETTINGS_COPY } from '../../../../i18n/notification-settings-copy'

interface ChannelState {
  inApp: boolean
  email: boolean
}
type NotificationAction = (input: unknown) => Promise<ActionResult>

const TYPE_IDS = [
  'assigned',
  'mentioned',
  'due_soon',
  'overdue',
  'digest',
  'intake_received',
  'email_received',
  'invitation_accepted',
  'stalled',
  'automation',
] as const

function defaults(source: Readonly<Record<string, unknown>>): Record<string, ChannelState> {
  return Object.fromEntries(
    TYPE_IDS.map((id) => {
      const value = source[id]
      const row = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
      return [id, { inApp: row.inApp !== false, email: row.email === true }]
    }),
  )
}

export function NotificationSettingsForm({
  action,
  channels,
  digestLocalTime,
}: Readonly<{ action: NotificationAction; channels: Readonly<Record<string, unknown>>; digestLocalTime: string }>) {
  const router = useRouter()
  const copy = catalogFor(NOTIFICATION_SETTINGS_COPY, useLocale())
  const [values, setValues] = useState<Record<string, ChannelState>>(() => defaults(channels))
  const [digest, setDigest] = useState(digestLocalTime)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string>()
  const save = async () => {
    setPending(true)
    setMessage(undefined)
    try {
      const result = await action({ channels: values, digestLocalTime: digest })
      setMessage(result.ok ? copy.saved : result.error.message)
      if (result.ok) router.refresh()
    } catch {
      setMessage(copy.failed)
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
              <th className="p-3 font-medium">{copy.notification}</th>
              <th className="w-28 p-3 text-center font-medium">{copy.inApp}</th>
              <th className="w-28 p-3 text-center font-medium">{copy.email}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {TYPE_IDS.map((id) => {
              const type = copy.types[id]
              return (
                <tr key={id}>
                  <td className="p-3">
                    <span className="block font-medium">{type.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{type.description}</span>
                  </td>
                  <td className="p-3 text-center">
                    <input
                      className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      type="checkbox"
                      aria-label={copy.channelAria.replace('{name}', type.label).replace('{channel}', copy.inApp)}
                      checked={values[id].inApp}
                      onChange={(event) => {
                        toggle(id, 'inApp', event.target.checked)
                      }}
                      disabled={pending}
                    />
                  </td>
                  <td className="p-3 text-center">
                    <input
                      className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      type="checkbox"
                      aria-label={copy.channelAria.replace('{name}', type.label).replace('{channel}', copy.email)}
                      checked={values[id].email}
                      onChange={(event) => {
                        toggle(id, 'email', event.target.checked)
                      }}
                      disabled={pending}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <label className="grid max-w-xs gap-1 text-sm">
        <span className="font-medium">{copy.digestTime}</span>
        <span className="text-xs text-muted-foreground">{copy.digestHelp}</span>
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
      <SaveBar
        pending={pending}
        label={copy.save}
        pendingLabel={copy.saving}
        message={message}
        onSave={() => {
          void save()
        }}
      />
    </div>
  )
}
