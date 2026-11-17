'use client'

import type { VoiceCall } from '@ops/module-crm'
import { Button } from '@ops/ui/components/ui/button'
import { Grip, Mic, MicOff, Pause, Phone, PhoneOff, Play } from 'lucide-react'
import { useState } from 'react'
import type { CallingCopy } from '../../../i18n/calling-copy'

function statusText(call: VoiceCall, copy: CallingCopy): string {
  if (call.direction === 'inbound' && call.state === 'ringing') return copy.incoming
  if (call.state === 'active') return copy.live
  if (call.state === 'ended' || call.state === 'missed') return copy.missed
  return copy.connecting
}

function duration(startedAt: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export function ActiveCallPanel({
  call,
  now,
  copy,
  pending,
  onAnswer,
  onDecline,
  onHangup,
  onMute,
  onHold,
  onDtmf,
}: Readonly<{
  call: VoiceCall
  now: number
  copy: CallingCopy
  pending: boolean
  onAnswer: () => void
  onDecline: () => void
  onHangup: () => void
  onMute: () => void
  onHold: () => void
  onDtmf: (digit: string) => void
}>) {
  const [muted, setMuted] = useState(false)
  const [held, setHeld] = useState(false)
  const [showKeypad, setShowKeypad] = useState(false)
  const isActive = call.state === 'active'
  const isIncoming = call.state === 'ringing' && call.direction === 'inbound'
  const otherParty = call.direction === 'inbound' ? call.from : call.to
  const myParty = call.direction === 'inbound' ? call.to : call.from
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-5 text-center">
      <CallSummary call={call} now={now} copy={copy} otherParty={otherParty} myParty={myParty} />
      {isIncoming ? <IncomingControls copy={copy} pending={pending} onDecline={onDecline} onAnswer={onAnswer} /> : null}
      {isActive ? (
        <CallControls
          copy={copy}
          muted={muted}
          held={held}
          onMute={() => {
            onMute()
            setMuted((value) => !value)
          }}
          onHold={() => {
            onHold()
            setHeld((value) => !value)
          }}
          onKeypad={() => {
            setShowKeypad((value) => !value)
          }}
          onHangup={onHangup}
          pending={pending}
        />
      ) : null}
      {showKeypad && isActive ? <DtmfPad onDtmf={onDtmf} /> : null}
    </div>
  )
}

function CallSummary({
  call,
  now,
  copy,
  otherParty,
  myParty,
}: Readonly<{ call: VoiceCall; now: number; copy: CallingCopy; otherParty: string; myParty: string }>) {
  const avatar = call.direction === 'inbound' ? <Phone aria-hidden className="size-7" /> : call.to.slice(-2)
  const elapsed = call.state === 'active' ? ` · ${duration(call.answeredAt ?? call.createdAt, now)}` : ''
  return (
    <>
      <div className="grid size-20 place-items-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
        {avatar}
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums">{otherParty}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {statusText(call, copy)}
          {elapsed}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {copy.from}: {myParty}
        </p>
      </div>
    </>
  )
}

function IncomingControls({
  copy,
  pending,
  onDecline,
  onAnswer,
}: Readonly<{ copy: CallingCopy; pending: boolean; onDecline: () => void; onAnswer: () => void }>) {
  return (
    <div className="flex gap-3">
      <Button variant="destructive" size="lg" disabled={pending} onClick={onDecline}>
        <PhoneOff aria-hidden />
        {copy.decline}
      </Button>
      <Button size="lg" disabled={pending} onClick={onAnswer}>
        <Phone aria-hidden />
        {copy.answer}
      </Button>
    </div>
  )
}

function CallControls({
  copy,
  muted,
  held,
  onMute,
  onHold,
  onKeypad,
  onHangup,
  pending,
}: Readonly<{
  copy: CallingCopy
  muted: boolean
  held: boolean
  pending: boolean
  onMute: () => void
  onHold: () => void
  onKeypad: () => void
  onHangup: () => void
}>) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button variant="outline" size="icon" aria-label={muted ? copy.unmute : copy.mute} onClick={onMute}>
        {muted ? <MicOff aria-hidden /> : <Mic aria-hidden />}
      </Button>
      <Button variant="outline" size="icon" aria-label={held ? copy.resume : copy.hold} onClick={onHold}>
        {held ? <Play aria-hidden /> : <Pause aria-hidden />}
      </Button>
      <Button variant="outline" size="icon" aria-label={copy.keypad} onClick={onKeypad}>
        <Grip aria-hidden />
      </Button>
      <Button variant="destructive" size="icon" aria-label={copy.end} disabled={pending} onClick={onHangup}>
        <PhoneOff aria-hidden />
      </Button>
    </div>
  )
}

function DtmfPad({ onDtmf }: Readonly<{ onDtmf: (digit: string) => void }>) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {'123456789*0#'.split('').map((digit) => (
        <Button
          type="button"
          key={digit}
          variant="outline"
          size="sm"
          onClick={() => {
            onDtmf(digit)
          }}
        >
          {digit}
        </Button>
      ))}
    </div>
  )
}
