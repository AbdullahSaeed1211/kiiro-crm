'use client'

import type { VoiceCall } from '@ops/module-crm'
import { useEffect, useState } from 'react'
import type { CallingCopy } from '../../../i18n/calling-copy'
import type { VoiceContextValue } from './voice-context-state'

interface CallInput {
  phone: string
  numberId: string
  leadId?: string
}
type WrapupValues = Record<string, unknown>

function safeMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback
}

export function useCallingPanelActions(voice: VoiceContextValue, copy: CallingCopy) {
  const [pending, setPending] = useState(false)
  const now = useCallTimer(voice.activeCall)
  const [wrapupCall, setWrapupCall] = useState<VoiceCall | null>(null)

  async function action<T>(run: () => Promise<T>): Promise<T | undefined> {
    setPending(true)
    voice.setError(null)
    try {
      return await run()
    } catch (cause) {
      voice.setError(safeMessage(cause, copy.error))
      return undefined
    } finally {
      setPending(false)
    }
  }
  const showError = createErrorHandler(voice, copy)
  const placeCall = (input: CallInput) => {
    void action(() => startCall(voice, input, copy))
  }
  const saveWrapup = (call: VoiceCall, values: WrapupValues) => {
    void action(() => finishWrapup({ voice, call, values, setWrapupCall }))
  }
  const answer = (call: VoiceCall) => {
    void action(() => voice.answerCall(call.id))
  }
  const decline = (call: VoiceCall) => {
    void action(() => voice.declineCall(call.id))
  }
  const hangup = (call: VoiceCall) => {
    void action(async () => {
      setWrapupCall(await voice.hangupCall(call.id))
    })
  }
  const toggleReceiving = () => {
    void action(() => toggleCallReception(voice))
  }

  return { pending, now, wrapupCall, placeCall, saveWrapup, answer, decline, hangup, toggleReceiving, showError }
}

function createErrorHandler(voice: VoiceContextValue, copy: CallingCopy): (cause: unknown) => void {
  return (cause) => {
    voice.setError(safeMessage(cause, copy.error))
  }
}

function useCallTimer(activeCall: VoiceCall | null): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (activeCall?.state !== 'active') return
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [activeCall?.state])
  return now
}

async function startCall(voice: VoiceContextValue, input: CallInput, copy: CallingCopy): Promise<void> {
  const result = await voice.beginCall({ to: input.phone, numberId: input.numberId, leadId: input.leadId })
  if (result.session.mode === 'telnyx') voice.setError(copy.connecting)
}

async function finishWrapup({
  voice,
  call,
  values,
  setWrapupCall,
}: Readonly<{
  voice: VoiceContextValue
  call: VoiceCall
  values: WrapupValues
  setWrapupCall: (call: VoiceCall | null) => void
}>): Promise<void> {
  await voice.performCallAction({ callId: call.id, action: 'wrapup', values })
  setWrapupCall(null)
  voice.clearDraft()
}

async function toggleCallReception(voice: VoiceContextValue): Promise<void> {
  if (voice.receivingCalls) await voice.stopReceivingCalls()
  else await voice.startReceivingCalls()
}
