'use client'

import { Badge } from '@ops/ui/components/ui/badge'
import type { VoiceSettings } from '@ops/module-crm'
import { useLocale } from '../../../../i18n/locale-context'
import { CALLING_COPY } from '../../../../i18n/calling-copy'
import { useCallingSettingsData } from './calling-settings-data'
import { NumberSearch, NumberTable, OfferDialog, TeamCallHistory, VoiceRoutingSettings } from './calling-settings-parts'

function modeLabel(mode: 'disabled' | 'simulator' | 'telnyx', copy: (typeof CALLING_COPY)['en']): string {
  if (mode === 'simulator') return copy.simulator
  if (mode === 'telnyx') return copy.live
  return copy.unavailable
}

export function CallingSettings() {
  const locale = useLocale()
  const copy = CALLING_COPY[locale]
  const data = useCallingSettingsData(copy)
  const { state } = data
  const snapshot = state.snapshot
  if (snapshot === null) return <p className="text-sm text-muted-foreground">{copy.connecting}</p>

  const configured = snapshot.configured && snapshot.mode !== 'disabled'
  const status = modeLabel(snapshot.mode, copy)
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={configured ? 'secondary' : 'outline'}>{status}</Badge>
        {!configured ? <span className="text-sm text-muted-foreground">{copy.setupRequired}</span> : null}
      </div>
      <RoutingBlock
        settings={state.settings}
        copy={copy}
        busy={state.busy}
        isConfigured={configured}
        onChange={data.setSettings}
        onSave={() => {
          void data.saveSettings()
        }}
      />
      <NumberSearch
        areaCode={state.areaCode}
        offers={state.offers}
        copy={copy}
        busy={state.busy}
        searchAvailable={configured}
        onAreaCodeChange={data.setAreaCode}
        onSearch={() => {
          void data.search()
        }}
        onBuy={data.setOffer}
      />
      <NumberTable snapshot={snapshot} copy={copy} onSave={data.saveNumber} onRelease={data.releaseNumber} />
      <TeamCallHistory snapshot={snapshot} locale={locale} copy={copy} />
      <OfferDialog
        offer={state.selectedOffer}
        copy={copy}
        busy={state.busy}
        onClose={() => {
          data.setOffer(null)
        }}
        onBuy={(offer) => {
          void data.buy(offer)
        }}
      />
      {state.error !== null ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.message !== null ? (
        <p role="status" className="text-sm text-muted-foreground">
          {state.message}
        </p>
      ) : null}
    </div>
  )
}

function RoutingBlock({
  settings,
  copy,
  busy,
  isConfigured,
  onChange,
  onSave,
}: Readonly<{
  settings: VoiceSettings | null
  copy: (typeof CALLING_COPY)['en']
  busy: boolean
  isConfigured: boolean
  onChange: (settings: VoiceSettings) => void
  onSave: () => void
}>) {
  if (settings === null) return <p className="text-sm text-muted-foreground">{copy.setupRequired}</p>
  return (
    <VoiceRoutingSettings
      settings={settings}
      copy={copy}
      busy={busy}
      isConfigured={isConfigured}
      onChange={onChange}
      onSave={onSave}
    />
  )
}
