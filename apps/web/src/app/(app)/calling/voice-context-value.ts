'use client'

import { useMemo } from 'react'
import type { VoiceCall, VoiceSnapshot } from '@ops/module-crm'
import type { VoiceContextValue, Draft } from './voice-context-state'

type ProviderActions = Pick<
  VoiceContextValue,
  | 'prepareVoice'
  | 'beginCall'
  | 'performCallAction'
  | 'answerCall'
  | 'declineCall'
  | 'hangupCall'
  | 'toggleMute'
  | 'toggleHold'
  | 'sendDtmf'
  | 'renewVoiceSession'
  | 'closeIdleSession'
>

type ContextInput = Pick<
  VoiceContextValue,
  | 'isOpen'
  | 'minimized'
  | 'deviceId'
  | 'tabAvailable'
  | 'receivingCalls'
  | 'error'
  | 'open'
  | 'minimize'
  | 'startReceivingCalls'
  | 'stopReceivingCalls'
  | 'refresh'
  | 'setSnapshot'
  | 'setError'
  | 'api'
  | 'voiceTabLock'
> & {
  snapshot: VoiceSnapshot | null
  activeCall: VoiceCall | null
  voice: ProviderActions
  draft: Draft
  setDraft: (draft: Draft) => void
}

export function useVoiceContextValue(input: ContextInput): VoiceContextValue {
  return useMemo(
    () => createVoiceContextValue(input),
    [
      input.snapshot,
      input.isOpen,
      input.minimized,
      input.deviceId,
      input.tabAvailable,
      input.receivingCalls,
      input.error,
      input.open,
      input.minimize,
      input.startReceivingCalls,
      input.stopReceivingCalls,
      input.refresh,
      input.setSnapshot,
      input.setError,
      input.api,
      input.activeCall,
      input.voice,
      input.draft,
      input.setDraft,
      input.voiceTabLock,
    ],
  )
}

function createVoiceContextValue(input: ContextInput): VoiceContextValue {
  return {
    snapshot: input.snapshot,
    isOpen: input.isOpen,
    minimized: input.minimized,
    deviceId: input.deviceId,
    tabAvailable: input.tabAvailable,
    receivingCalls: input.receivingCalls,
    error: input.error,
    open: input.open,
    minimize: input.minimize,
    startReceivingCalls: input.startReceivingCalls,
    stopReceivingCalls: input.stopReceivingCalls,
    refresh: input.refresh,
    setSnapshot: input.setSnapshot,
    setError: input.setError,
    api: input.api,
    activeCall: input.activeCall,
    ...input.voice,
    acceptDraft: () => input.draft,
    clearDraft: () => {
      input.setDraft({})
    },
    voiceTabLock: input.voiceTabLock,
  }
}
