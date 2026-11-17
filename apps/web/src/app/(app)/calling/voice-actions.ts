'use client'

import type { VoiceCall, VoiceClientSession, VoiceDialResult } from '@ops/module-crm'
import { useCallback, useMemo, useRef } from 'react'
import { VoiceBrowserClient } from './voice-client'

type Api = <T>(path: string, init?: RequestInit) => Promise<T>
interface SessionOptions {
  api: Api
  deviceId: string
  sessionRef: { current: VoiceClientSession | null }
}
interface ActionsOptions {
  api: Api
  deviceId: string
  sessionRef: { current: VoiceClientSession | null }
  clientRef: { current: VoiceBrowserClient }
  refresh: () => Promise<void>
  voiceAvailable: boolean
  acquireLock: () => Promise<boolean>
}
interface DialOptions extends ActionsOptions {
  to: string
  numberId: string
  leadId?: string
}
interface CallActionOptions extends ActionsOptions {
  callId: string
  action: string
  values?: Record<string, unknown>
}

async function getVoiceSession(
  { api, deviceId, sessionRef }: SessionOptions,
  force = false,
): Promise<VoiceClientSession> {
  if (deviceId === '') throw new Error('Voice device is not ready.')
  const current = sessionRef.current
  if (!force && current !== null && current.expiresAt > Date.now() + 30_000) return current
  const session = await api<VoiceClientSession>('/session', { method: 'POST', body: JSON.stringify({ deviceId }) })
  sessionRef.current = session
  return session
}

async function connectBrowser(
  session: VoiceClientSession,
  clientRef: ActionsOptions['clientRef'],
  refresh: () => Promise<void>,
): Promise<void> {
  if (session.mode === 'simulator') return
  await clientRef.current.connect(session, (call) => {
    if (call.state === 'ringing' || ['hangup', 'destroy', 'purge'].includes(call.state ?? '')) void refresh()
  })
}

async function prepareSession(options: ActionsOptions): Promise<VoiceClientSession | null> {
  if (!options.voiceAvailable) return null
  const session = await getVoiceSession(options)
  if (session.mode === 'telnyx' && !(await options.acquireLock())) throw new Error('Calling is open in another tab.')
  await connectBrowser(session, options.clientRef, options.refresh)
  return session
}

async function placeCall(options: DialOptions): Promise<VoiceDialResult> {
  const session = await prepareSession(options)
  if (session === null) throw new Error('Calling is unavailable.')
  const localStream =
    session.mode === 'telnyx' ? await navigator.mediaDevices.getUserMedia({ audio: true, video: false }) : null
  try {
    const result = await options.api<VoiceDialResult>('/calls', {
      method: 'POST',
      body: JSON.stringify({
        to: options.to,
        numberId: options.numberId,
        leadId: options.leadId,
        requestKey: crypto.randomUUID(),
        deviceId: options.deviceId,
      }),
    })
    options.sessionRef.current = result.session
    if (result.session.mode === 'telnyx' && localStream !== null) options.clientRef.current.dial(result, localStream)
    await options.refresh()
    return result
  } catch (cause) {
    localStream?.getTracks().forEach((track) => {
      track.stop()
    })
    throw cause
  }
}

async function updateCall(options: CallActionOptions): Promise<VoiceCall> {
  const deviceAction = options.action === 'answer' || options.action === 'decline' || options.action === 'hangup'
  const call = await options.api<VoiceCall>(`/calls/${encodeURIComponent(options.callId)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      action: options.action,
      ...options.values,
      ...(deviceAction ? { deviceId: options.deviceId } : {}),
    }),
  })
  if (options.action === 'hangup' || options.action === 'decline') await options.clientRef.current.hangup()
  await options.refresh()
  return call
}

async function answerInbound(options: Omit<CallActionOptions, 'action'>): Promise<void> {
  const session = await prepareSession(options)
  if (session === null) throw new Error('Calling is unavailable.')
  const localStream =
    session.mode === 'telnyx' ? await navigator.mediaDevices.getUserMedia({ audio: true, video: false }) : undefined
  try {
    const call = await updateCall({ ...options, action: 'answer' })
    if (session.mode === 'telnyx' && (call.state === 'active' || call.state === 'connecting'))
      await options.clientRef.current.answer(localStream)
  } catch (cause) {
    await options.clientRef.current.hangup()
    localStream?.getTracks().forEach((track) => {
      track.stop()
    })
    await options.refresh()
    throw cause
  }
}

/** Keeps SDK credentials and the SIP connection in memory for the persistent app frame. */
export function useVoiceActions(options: Omit<ActionsOptions, 'sessionRef' | 'clientRef'>) {
  const sessionRef = useRef<VoiceClientSession | null>(null)
  const clientRef = useRef(new VoiceBrowserClient())
  const { api, deviceId, refresh, voiceAvailable, acquireLock } = options
  const actionOptions = useMemo<ActionsOptions>(
    () => ({ api, deviceId, refresh, voiceAvailable, acquireLock, sessionRef, clientRef }),
    [api, deviceId, refresh, voiceAvailable, acquireLock],
  )
  return {
    ...useVoiceSessionActions(actionOptions, clientRef, sessionRef),
    ...useVoiceCallActions(actionOptions),
    ...useVoiceControls(clientRef),
  }
}

function useVoiceSessionActions(
  actionOptions: ActionsOptions,
  clientRef: { current: VoiceBrowserClient },
  sessionRef: { current: VoiceClientSession | null },
) {
  const prepareVoice = useCallback(async () => {
    await prepareSession(actionOptions)
  }, [actionOptions])
  const disconnect = useCallback(async () => {
    await clientRef.current.disconnect()
  }, [])
  const renewVoiceSession = useCallback(async () => {
    const session = await getVoiceSession(actionOptions, true)
    if (session.mode !== 'telnyx') return
    if (!clientRef.current.connected) await connectBrowser(session, clientRef, actionOptions.refresh)
    else await clientRef.current.renewToken(session)
  }, [actionOptions])
  const closeIdleSession = useCallback(async () => {
    const { api, deviceId } = actionOptions
    if (sessionRef.current !== null && deviceId !== '') {
      await api('/session', { method: 'DELETE', body: JSON.stringify({ deviceId }) })
    }
    await clientRef.current.disconnect()
    sessionRef.current = null
  }, [actionOptions, sessionRef])
  return { prepareVoice, disconnect, renewVoiceSession, closeIdleSession }
}

function useVoiceCallActions(actionOptions: ActionsOptions) {
  const performCallAction = useCallback(
    (input: { callId: string; action: string; values?: Record<string, unknown> }) =>
      updateCall({ ...actionOptions, ...input }),
    [actionOptions],
  )
  const beginCall = useCallback(
    (input: { to: string; numberId: string; leadId?: string }) => placeCall({ ...actionOptions, ...input }),
    [actionOptions],
  )
  const answerCall = useCallback((callId: string) => answerInbound({ ...actionOptions, callId }), [actionOptions])
  const declineCall = useCallback(
    (callId: string) => performCallAction({ callId, action: 'decline' }),
    [performCallAction],
  )
  const hangupCall = useCallback(
    (callId: string) => performCallAction({ callId, action: 'hangup' }),
    [performCallAction],
  )
  return { beginCall, performCallAction, answerCall, declineCall, hangupCall }
}

function useVoiceControls(clientRef: { current: VoiceBrowserClient }) {
  const toggleMute = useCallback(() => {
    clientRef.current.toggleMute()
  }, [])
  const toggleHold = useCallback(async () => {
    await clientRef.current.toggleHold()
  }, [])
  const sendDtmf = useCallback((digit: string) => {
    clientRef.current.sendDtmf(digit)
  }, [])
  return { toggleMute, toggleHold, sendDtmf }
}
