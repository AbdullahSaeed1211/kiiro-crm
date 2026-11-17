'use client'

import type { VoiceCall, VoiceSnapshot } from '@ops/module-crm'
import { useCallback, useEffect, useState } from 'react'
import { useLocale } from '../../../i18n/locale-context'
import { CALLING_COPY } from '../../../i18n/calling-copy'
import type { VoiceContextValue } from './voice-context-state'

const DEVICE_KEY = 'ops.voice.device'

export function newDeviceId(): string {
  const stored = window.sessionStorage.getItem(DEVICE_KEY)
  if (stored !== null) return stored
  const id = window.crypto.randomUUID()
  window.sessionStorage.setItem(DEVICE_KEY, id)
  return id
}

export function useVoiceSnapshot(api: VoiceContextValue['api']) {
  const locale = useLocale()
  const unavailable = CALLING_COPY[locale].unavailable
  const [snapshot, setSnapshot] = useState<VoiceSnapshot | null>(null)
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api<VoiceSnapshot>('')
      setSnapshot(next)
      setActiveCall(
        next.calls.find((call) => ['authorizing', 'ringing', 'connecting', 'active'].includes(call.state)) ?? null,
      )
      setError(null)
    } catch {
      setError(unavailable)
    }
  }, [api, unavailable])
  return { snapshot, activeCall, error, setError, setSnapshot, refresh }
}

export function hasAssignedInbound(snapshot: VoiceSnapshot | null): boolean {
  if (snapshot === null || !snapshot.configured || snapshot.mode === 'disabled' || !snapshot.settings.enabled)
    return false
  return snapshot.numbers.some(
    (number) => number.status === 'active' && number.inboundEnabled && number.assigneeIds.includes(snapshot.userId),
  )
}

export function voiceAvailability(snapshot: VoiceSnapshot | null, activeCall: VoiceCall | null) {
  return { hasAssignedInboundNumber: hasAssignedInbound(snapshot), hasCall: activeCall !== null }
}

export function useVoiceLifetime({
  setDeviceId,
  refresh,
  receiveInbound,
  hasCall,
  voiceAvailable,
  renew,
  closeSession,
  unlock,
  unavailable,
  setError,
}: Readonly<{
  setDeviceId: (id: string) => void
  refresh: () => Promise<void>
  receiveInbound: boolean
  hasCall: boolean
  voiceAvailable: boolean
  renew: () => Promise<void>
  closeSession: () => Promise<void>
  unlock: () => void
  unavailable: string
  setError: (message: string | null) => void
}>) {
  useClientVoiceDevice(setDeviceId)
  useInitialVoiceRefresh(refresh)
  useSnapshotPolling(refresh, receiveInbound || hasCall)
  useSessionRenewal({
    enabled: receiveInbound || hasCall,
    available: voiceAvailable,
    renew,
    message: unavailable,
    setError,
  })
  useCallSessionCleanup({ receiveInbound, hasCall, closeSession, unlock })
  useUnloadWarning(hasCall)
}

function useClientVoiceDevice(setDeviceId: (id: string) => void): void {
  useEffect(() => {
    setDeviceId(newDeviceId())
  }, [])
}

function useInitialVoiceRefresh(refresh: () => Promise<void>): void {
  useEffect(() => {
    void refresh()
  }, [refresh])
}

function useCallSessionCleanup({
  receiveInbound,
  hasCall,
  closeSession,
  unlock,
}: Readonly<{
  receiveInbound: boolean
  hasCall: boolean
  closeSession: () => Promise<void>
  unlock: () => void
}>): void {
  useEffect(() => {
    if (receiveInbound || hasCall) return
    unlock()
    void closeSession()
  }, [closeSession, hasCall, receiveInbound, unlock])
  useEffect(
    () => () => {
      void closeSession()
    },
    [closeSession],
  )
}

function useSnapshotPolling(refresh: () => Promise<void>, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const pollVisible = () => {
      if (!document.hidden) void refresh()
    }
    const timer = window.setInterval(pollVisible, 5000)
    document.addEventListener('visibilitychange', pollVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', pollVisible)
    }
  }, [enabled, refresh])
}

function useSessionRenewal({
  enabled,
  available,
  renew,
  message,
  setError,
}: Readonly<{
  enabled: boolean
  available: boolean
  renew: () => Promise<void>
  message: string
  setError: (message: string | null) => void
}>): void {
  useEffect(() => {
    if (!enabled || !available) return
    const timer = window.setInterval(() => {
      void renew().catch(() => {
        setError(message)
      })
    }, 60_000)
    return () => {
      window.clearInterval(timer)
    }
  }, [available, enabled, message, renew, setError])
}

function useUnloadWarning(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      Object.defineProperty(event, 'returnValue', { value: '' })
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      window.removeEventListener('beforeunload', warn)
    }
  }, [enabled])
}

export function useInboundCallControls({
  hasAssignedInboundNumber,
  hasCall,
  activeCall,
  prepare,
  closeSession,
  unlock,
  copy,
}: Readonly<{
  hasAssignedInboundNumber: boolean
  hasCall: boolean
  activeCall: VoiceCall | null
  prepare: () => Promise<void>
  closeSession: () => Promise<void>
  unlock: () => void
  copy: (typeof CALLING_COPY)['en']
}>) {
  const [receivingCalls, setReceivingCalls] = useState(false)
  const startReceivingCalls = useCallback(async () => {
    if (!hasAssignedInboundNumber) throw new Error(copy.noAssignedNumber)
    try {
      await prepare()
      setReceivingCalls(true)
    } catch (error) {
      await closeSession()
      unlock()
      throw error
    }
  }, [closeSession, copy.noAssignedNumber, hasAssignedInboundNumber, prepare, unlock])
  const stopReceivingCalls = useCallback(async () => {
    if (activeCall !== null) throw new Error(copy.error)
    await closeSession()
    unlock()
    setReceivingCalls(false)
  }, [activeCall, closeSession, copy.error, unlock])
  useReceivingCallGuard({ receivingCalls, hasAssignedInboundNumber, hasCall, setReceivingCalls, closeSession, unlock })
  return { receivingCalls, startReceivingCalls, stopReceivingCalls }
}

function useReceivingCallGuard({
  receivingCalls,
  hasAssignedInboundNumber,
  hasCall,
  setReceivingCalls,
  closeSession,
  unlock,
}: Readonly<{
  receivingCalls: boolean
  hasAssignedInboundNumber: boolean
  hasCall: boolean
  setReceivingCalls: (enabled: boolean) => void
  closeSession: () => Promise<void>
  unlock: () => void
}>): void {
  useEffect(() => {
    if (!receivingCalls || hasAssignedInboundNumber || hasCall) return
    setReceivingCalls(false)
    unlock()
    void closeSession()
  }, [closeSession, hasAssignedInboundNumber, hasCall, receivingCalls, setReceivingCalls, unlock])
}

export function useIncomingCallDisplay({
  activeCall,
  open,
  minimize,
}: Readonly<{
  activeCall: VoiceCall | null
  open: (open: boolean) => void
  minimize: (minimized: boolean) => void
}>): void {
  useEffect(() => {
    if (activeCall?.direction !== 'inbound' || activeCall.state !== 'ringing') return
    open(true)
    minimize(false)
  }, [activeCall?.direction, activeCall?.state, minimize, open])
}
