'use client'

import { useCallback, useMemo } from 'react'
import type { VoiceCall } from '@ops/module-crm'
import type { Draft } from './voice-context-state'
import { useVoiceActions } from './voice-actions'
import type { VoiceContextValue } from './voice-context-state'

interface VoiceRuntimeOptions {
  api: VoiceContextValue['api']
  deviceId: string
  refresh: () => Promise<void>
  voiceAvailable: boolean
  voiceTabLock: () => Promise<boolean>
  setError: (message: string | null) => void
}

export function useVoiceRuntime({
  api,
  deviceId,
  refresh,
  voiceAvailable,
  voiceTabLock,
  setError,
}: VoiceRuntimeOptions) {
  const options = useMemo(
    () => ({ api, deviceId, refresh, voiceAvailable, acquireLock: voiceTabLock, setError }),
    [api, deviceId, refresh, voiceAvailable, voiceTabLock, setError],
  )
  return useVoiceActions(options)
}

interface PanelStateOptions {
  activeCall: VoiceCall | null
  receivingCalls: boolean
  unlock: () => void
  closeIdleSession: () => Promise<void>
  setError: (message: string | null) => void
  setIsOpen: (open: boolean) => void
  setMinimized: (minimized: boolean) => void
  setDraft: (draft: Draft) => void
}

export function useVoicePanelOpen(options: PanelStateOptions) {
  const { activeCall, receivingCalls, unlock, closeIdleSession, setError, setIsOpen, setMinimized, setDraft } = options
  const open = useCallback(
    (draft: Draft = {}) => {
      setDraft(draft)
      setIsOpen(true)
      setMinimized(false)
      setError(null)
    },
    [setDraft, setError, setIsOpen, setMinimized],
  )
  const minimize = useCallback(() => {
    if (activeCall !== null) {
      setMinimized(true)
      return
    }
    setIsOpen(false)
    if (receivingCalls) return
    unlock()
    void closeIdleSession()
  }, [activeCall, closeIdleSession, receivingCalls, setIsOpen, setMinimized, unlock])
  return { open, minimize }
}
