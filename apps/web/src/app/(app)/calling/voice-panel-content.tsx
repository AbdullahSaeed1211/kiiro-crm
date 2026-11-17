'use client'

import type { VoiceCall, VoiceSnapshot } from '@ops/module-crm'
import type { CallingCopy } from '../../../i18n/calling-copy'
import { ActiveCallPanel, DialerForm, RecentCalls, WrapupForm } from './calling-panel-parts'

interface CallingContentProps {
  snapshot: VoiceSnapshot | null
  activeCall: VoiceCall | null
  wrapupCall: VoiceCall | null
  draft: { number?: string; leadId?: string; leadName?: string }
  locale: string
  copy: CallingCopy
  pending: boolean
  now: number
  tabAvailable: boolean
  onCall: (input: { phone: string; numberId: string; leadId?: string }) => void
  onAnswer: (call: VoiceCall) => void
  onDecline: (call: VoiceCall) => void
  onHangup: (call: VoiceCall) => void
  onMute: () => void
  onHold: () => void
  onDtmf: (digit: string) => void
  onSaveWrapup: (call: VoiceCall, values: Record<string, unknown>) => void
}

export function CallingPanelContent(props: Readonly<CallingContentProps>) {
  return (
    <>
      <DialerSlot {...props} />
      <ActiveCallSlot {...props} />
      <WrapupSlot {...props} />
      <HistorySlot {...props} />
    </>
  )
}

function DialerSlot({ snapshot, activeCall, wrapupCall, ...props }: Readonly<CallingContentProps>) {
  if (!snapshot?.configured || activeCall !== null || wrapupCall !== null) return null
  return (
    <DialerForm
      snapshot={snapshot}
      draft={props.draft}
      copy={props.copy}
      tabAvailable={props.tabAvailable}
      pending={props.pending}
      onCall={props.onCall}
    />
  )
}

function ActiveCallSlot({
  activeCall,
  now,
  copy,
  pending,
  onAnswer,
  onDecline,
  onHangup,
  onMute,
  onHold,
  onDtmf,
}: Readonly<CallingContentProps>) {
  if (activeCall === null) return null
  return (
    <ActiveCallPanel
      call={activeCall}
      now={now}
      copy={copy}
      pending={pending}
      onAnswer={() => {
        onAnswer(activeCall)
      }}
      onDecline={() => {
        onDecline(activeCall)
      }}
      onHangup={() => {
        onHangup(activeCall)
      }}
      onMute={onMute}
      onHold={onHold}
      onDtmf={onDtmf}
    />
  )
}

function WrapupSlot({ wrapupCall, copy, locale, pending, onSaveWrapup }: Readonly<CallingContentProps>) {
  if (wrapupCall === null) return null
  return <WrapupForm call={wrapupCall} copy={copy} locale={locale} pending={pending} onSave={onSaveWrapup} />
}

function HistorySlot({ snapshot, activeCall, wrapupCall, locale, copy }: Readonly<CallingContentProps>) {
  if (!snapshot?.configured || activeCall !== null || wrapupCall !== null) return null
  return <RecentSection snapshot={snapshot} locale={locale} copy={copy} />
}

function RecentSection({
  snapshot,
  locale,
  copy,
}: Readonly<{ snapshot: VoiceSnapshot; locale: string; copy: CallingCopy }>) {
  return (
    <section className="mt-6 border-t pt-4" aria-labelledby="voice-recent-heading">
      <h3 id="voice-recent-heading" className="mb-2 text-sm font-medium">
        {copy.ownHistory}
      </h3>
      <RecentCalls snapshot={snapshot} locale={locale} copy={copy} />
    </section>
  )
}
