'use client'

import type { VoiceCall, VoiceDialResult, VoiceSnapshot } from '@ops/module-crm'
import { createContext, useContext } from 'react'

export interface Draft {
  number?: string
  leadId?: string
  leadName?: string
}

export interface VoiceContextValue {
  snapshot: VoiceSnapshot | null
  isOpen: boolean
  minimized: boolean
  deviceId: string
  tabAvailable: boolean
  receivingCalls: boolean
  error: string | null
  open: (draft?: Draft) => void
  minimize: () => void
  startReceivingCalls: () => Promise<void>
  stopReceivingCalls: () => Promise<void>
  refresh: () => Promise<void>
  setSnapshot: (snapshot: VoiceSnapshot) => void
  setError: (error: string | null) => void
  api: <T>(path: string, init?: RequestInit) => Promise<T>
  activeCall: VoiceCall | null
  beginCall: (input: { to: string; numberId: string; leadId?: string }) => Promise<VoiceDialResult>
  performCallAction: (input: { callId: string; action: string; values?: Record<string, unknown> }) => Promise<VoiceCall>
  acceptDraft: () => Draft
  clearDraft: () => void
  voiceTabLock: () => Promise<boolean>
  prepareVoice: () => Promise<void>
  answerCall: (callId: string) => Promise<void>
  declineCall: (callId: string) => Promise<VoiceCall>
  hangupCall: (callId: string) => Promise<VoiceCall>
  toggleMute: () => void
  toggleHold: () => Promise<void>
  sendDtmf: (digit: string) => void
  renewVoiceSession: () => Promise<void>
  closeIdleSession: () => Promise<void>
}

export const VoiceContext = createContext<VoiceContextValue | null>(null)

export function useVoice(): VoiceContextValue {
  const context = useContext(VoiceContext)
  if (context === null) throw new Error('Calling controls must be inside VoiceProvider.')
  return context
}
