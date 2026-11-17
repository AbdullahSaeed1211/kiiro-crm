'use client'

import { useCallback, useState, type ReactNode } from 'react'
import type { VoiceCall } from '@ops/module-crm'
import { useLocale } from '../../../i18n/locale-context'
import { CALLING_COPY } from '../../../i18n/calling-copy'
import { CallingPanel } from './voice-panel'
import { MinimizedCall } from './minimized-call'
import { useVoiceContextValue } from './voice-context-value'
import { useVoicePanelOpen } from './voice-provider-actions'
import {
  useIncomingCallDisplay,
  useVoiceLifetime,
  useVoiceSnapshot,
  voiceAvailability,
  useInboundCallControls,
} from './voice-context-lifecycle'
import { voiceApi } from './voice-api'
import { VoiceContext, type Draft, type VoiceContextValue } from './voice-context-state'
import { useVoiceTabLock } from './voice-tab-lock'
import { useVoiceRuntime } from './voice-provider-actions'
/** Keeps browser calling mounted above route templates so page changes preserve a call. */
export function VoiceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const locale = useLocale()
  const copy = CALLING_COPY[locale]
  const [deviceId, setDeviceId] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [draft, setDraft] = useState<Draft>({})
  const api = useCallback(<T,>(path: string, init?: RequestInit) => voiceApi<T>(path, init), [])
  const { snapshot, activeCall, error, setError, setSnapshot, refresh } = useVoiceSnapshot(api)
  const { available: tabAvailable, acquire: voiceTabLock, unlock } = useVoiceTabLock()
  const voiceAvailable = snapshot?.configured === true && snapshot.mode !== 'disabled'
  const voice = useVoiceRuntime({ api, deviceId, refresh, voiceAvailable, voiceTabLock, setError })
  const { hasAssignedInboundNumber, hasCall } = voiceAvailability(snapshot, activeCall)
  const { receivingCalls, startReceivingCalls, stopReceivingCalls } = useInboundCallControls({
    hasAssignedInboundNumber,
    hasCall,
    activeCall,
    prepare: voice.prepareVoice,
    closeSession: voice.closeIdleSession,
    unlock,
    copy,
  })
  useVoiceLifetime({
    setDeviceId,
    refresh,
    receiveInbound: receivingCalls && hasAssignedInboundNumber,
    hasCall,
    voiceAvailable,
    renew: voice.renewVoiceSession,
    closeSession: voice.closeIdleSession,
    unlock,
    unavailable: copy.unavailable,
    setError,
  })
  useIncomingCallDisplay({ activeCall, open: setIsOpen, minimize: setMinimized })

  const { open, minimize } = useVoicePanelOpen({
    activeCall,
    receivingCalls,
    unlock,
    closeIdleSession: voice.closeIdleSession,
    setError,
    setIsOpen,
    setMinimized,
    setDraft,
  })
  const context = useVoiceContextValue({
    snapshot,
    isOpen,
    minimized,
    deviceId,
    tabAvailable,
    receivingCalls,
    error,
    open,
    minimize,
    startReceivingCalls,
    stopReceivingCalls,
    refresh,
    setSnapshot,
    setError,
    api,
    activeCall,
    voice,
    draft,
    setDraft,
    voiceTabLock,
  })

  return (
    <VoiceProviderSurfaces
      context={context}
      children={children}
      minimized={minimized}
      activeCall={activeCall}
      label={copy.dialer}
      setMinimized={setMinimized}
      setIsOpen={setIsOpen}
    />
  )
}

function VoiceProviderSurfaces({
  context,
  children,
  minimized,
  activeCall,
  label,
  setMinimized,
  setIsOpen,
}: Readonly<{
  context: VoiceContextValue
  children: ReactNode
  minimized: boolean
  activeCall: VoiceCall | null
  label: string
  setMinimized: (value: boolean) => void
  setIsOpen: (value: boolean) => void
}>) {
  return (
    <VoiceContext value={context}>
      {children}
      <CallingPanel />
      {minimized && activeCall !== null ? (
        <MinimizedCall
          call={activeCall}
          label={label}
          onOpen={() => {
            setMinimized(false)
            setIsOpen(true)
          }}
        />
      ) : null}
    </VoiceContext>
  )
}
