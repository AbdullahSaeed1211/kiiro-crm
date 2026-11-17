'use client'

import type { VoiceSettings } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import { Switch } from '@ops/ui/components/ui/switch'
import type { CallingCopy } from '../../../../i18n/calling-copy'
import { NumberSetting } from './number-setting'
type Copy = CallingCopy

export function VoiceRoutingSettings({
  settings,
  copy,
  busy,
  isConfigured,
  onChange,
  onSave,
}: Readonly<{
  settings: VoiceSettings
  copy: Copy
  busy: boolean
  isConfigured: boolean
  onChange: (settings: VoiceSettings) => void
  onSave: () => void
}>) {
  return (
    <section className="space-y-4">
      <h2 className="font-medium">{copy.routing}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-h-10 items-center justify-between gap-4 text-sm">
          <span>{copy.enabled}</span>
          <Switch
            checked={settings.enabled}
            disabled={!isConfigured}
            onCheckedChange={(enabled) => {
              onChange({ ...settings, enabled })
            }}
          />
        </label>
        <label className="flex min-h-10 items-center justify-between gap-4 text-sm">
          <span>{copy.recordingEnabled}</span>
          <Switch
            checked={settings.recordingEnabled}
            onCheckedChange={(recordingEnabled) => {
              onChange({ ...settings, recordingEnabled })
            }}
          />
        </label>
        <FallbackSettings settings={settings} copy={copy} onChange={onChange} />
        <NumberSetting
          label={copy.limit}
          min={30}
          max={7200}
          value={settings.maxCallSeconds}
          onChange={(maxCallSeconds) => {
            onChange({ ...settings, maxCallSeconds })
          }}
        />
        <NumberSetting
          label={copy.concurrency}
          min={1}
          max={50}
          value={settings.maxConcurrentCalls}
          onChange={(maxConcurrentCalls) => {
            onChange({ ...settings, maxConcurrentCalls })
          }}
        />
        <NumberSetting
          label={copy.ringTime}
          min={10}
          max={120}
          value={settings.ringSeconds}
          onChange={(ringSeconds) => {
            onChange({ ...settings, ringSeconds })
          }}
        />
      </div>
      <Button disabled={busy} onClick={onSave}>
        {copy.saveSettings}
      </Button>
    </section>
  )
}

function FallbackSettings({
  settings,
  copy,
  onChange,
}: Readonly<{
  settings: VoiceSettings
  copy: Copy
  onChange: (settings: VoiceSettings) => void
}>) {
  return (
    <>
      <FallbackSelect settings={settings} copy={copy} onChange={onChange} />
      {settings.fallback === 'forward' ? (
        <label className="grid gap-1 text-sm">
          <span>{copy.forwardingNumber}</span>
          <Input
            type="tel"
            value={settings.forwardingNumber ?? ''}
            onChange={(event) => {
              onChange({ ...settings, forwardingNumber: event.target.value || null })
            }}
          />
        </label>
      ) : null}
    </>
  )
}

function FallbackSelect({
  settings,
  copy,
  onChange,
}: Readonly<{
  settings: VoiceSettings
  copy: Copy
  onChange: (settings: VoiceSettings) => void
}>) {
  return (
    <label className="grid gap-1 text-sm">
      <span>{copy.fallback}</span>
      <Select
        value={settings.fallback}
        onValueChange={(fallback: 'voicemail' | 'forward' | null) => {
          onChange({ ...settings, fallback: fallback ?? 'voicemail' })
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="voicemail">{copy.voicemail}</SelectItem>
          <SelectItem value="forward">{copy.forward}</SelectItem>
        </SelectContent>
      </Select>
    </label>
  )
}
