import type { VoiceCall } from './voice-contracts'
import type { z } from 'zod'
import type { voiceCallActionSchema } from './voice-schema'
import { conflict, forbidden, unavailable, type VoiceEngineDeps, type VoiceResult } from './voice-core'
import { ok } from '@ops/kernel'

/** Claim an inbound call, answer its caller leg, and wait for the browser leg. */
export async function answerInboundCall({
  deps,
  call,
  actorId,
  deviceId,
}: {
  deps: VoiceEngineDeps
  call: VoiceCall
  actorId: string
  deviceId: string
}): Promise<VoiceResult<VoiceCall>> {
  if (call.direction !== 'inbound') return conflict('This call is no longer ringing.')
  const leg = await inboundDeviceLeg({ deps, call, actorId, deviceId })
  if (!leg.ok) return leg
  if (call.providerCallId === null) return conflict('This device is no longer ringing.')
  if (deps.provider === null) return unavailable()
  const claimed = await claimOrResumeInboundAnswer({ deps, call, actorId, deviceCallId: leg.value.providerCallId })
  if (!claimed.ok) return claimed
  await answerInboundCaller(deps, claimed.value, actorId)
  return ok(claimed.value)
}

async function inboundDeviceLeg({
  deps,
  call,
  actorId,
  deviceId,
}: {
  deps: VoiceEngineDeps
  call: VoiceCall
  actorId: string
  deviceId: string
}): Promise<VoiceResult<{ readonly id: string; readonly providerCallId: string }>> {
  const device = await deps.repo.getDevice(actorId, deviceId)
  if (device === undefined || device.expiresAt <= deps.now() || deps.now() - device.lastSeenAt > 2 * 60_000)
    return forbidden()
  const leg = await deps.repo.getCallLeg(call.id, deviceId, 'inbound-device')
  return leg?.providerCallId
    ? ok({ id: leg.id, providerCallId: leg.providerCallId })
    : conflict('This device is no longer ringing.')
}

async function claimOrResumeInboundAnswer({
  deps,
  call,
  actorId,
  deviceCallId,
}: {
  deps: VoiceEngineDeps
  call: VoiceCall
  actorId: string
  deviceCallId: string
}): Promise<VoiceResult<VoiceCall>> {
  if (call.state === 'connecting' && call.userId === actorId && call.providerBrowserCallId === deviceCallId)
    return ok(call)
  if (call.state !== 'ringing' || call.userId !== null) return conflict('Another teammate answered this call.')
  return claimAndMarkInboundAnswer({ deps, call, actorId, deviceCallId })
}

async function claimAndMarkInboundAnswer({
  deps,
  call,
  actorId,
  deviceCallId,
}: {
  deps: VoiceEngineDeps
  call: VoiceCall
  actorId: string
  deviceCallId: string
}): Promise<VoiceResult<VoiceCall>> {
  const settings = await deps.repo.loadSettings()
  const claimed = await deps.repo.claimInboundCall(call.id, actorId, {
    answeredAt: deps.now(),
    maxConcurrentCalls: settings.maxConcurrentCalls,
  })
  if (claimed === undefined) return conflict('Another teammate answered this call.')
  const marked = await deps.repo.updateCall(
    claimed.id,
    { providerBrowserCallId: deviceCallId, updatedAt: deps.now() },
    { states: ['connecting'], updatedAt: claimed.updatedAt },
  )
  if (marked !== undefined) return ok(marked)
  const raced = await deps.repo.getCall(call.id)
  return raced?.state === 'connecting' && raced.userId === actorId && raced.providerBrowserCallId === deviceCallId
    ? ok(raced)
    : conflict('Another teammate answered this call.')
}

async function answerInboundCaller(deps: VoiceEngineDeps, call: VoiceCall, actorId: string): Promise<void> {
  if (call.providerCallId === null || deps.provider === null) return
  await deps.provider.command({
    action: 'answer',
    call,
    userId: actorId,
    providerCallId: call.providerCallId,
  })
  const callerLeg = await deps.repo.getCallLeg(call.id, null, 'inbound-caller')
  if (callerLeg !== undefined)
    await deps.repo.updateCallLeg(callerLeg.id, { state: 'answered', updatedAt: deps.now() }, ['ringing', 'answered'])
}

/** Decline an inbound ring on the actor's assigned device. */
export async function declineInboundCall({
  deps,
  call,
  actorId,
  deviceId,
}: {
  deps: VoiceEngineDeps
  call: VoiceCall
  actorId: string
  deviceId: string
}): Promise<VoiceResult<VoiceCall>> {
  if (call.direction !== 'inbound' || call.state !== 'ringing') return conflict('This call is no longer ringing.')
  const leg = await deps.repo.getCallLeg(call.id, deviceId, 'inbound-device')
  if (leg?.providerCallId === null || leg?.providerCallId === undefined)
    return conflict('This device is no longer ringing.')
  if (deps.provider !== null)
    await deps.provider.command({ action: 'decline', call, userId: actorId, providerCallId: leg.providerCallId })
  await deps.repo.updateCallLeg(leg.id, { state: 'ended', updatedAt: deps.now() }, ['dialing', 'ringing'])
  return ok(call)
}

/** End an authorized call and all persisted provider legs. */
export async function hangupCall(
  deps: VoiceEngineDeps,
  call: VoiceCall,
  actorId: string,
): Promise<VoiceResult<VoiceCall>> {
  if (call.state === 'ended' && call.error === 'cleanup_pending') return retryHangupCleanup(deps, call, actorId)
  if (!['active', 'connecting', 'ringing', 'authorizing'].includes(call.state))
    return conflict('This call has already ended.')
  const cleanupPending = deps.provider !== null
  const saved = await deps.repo.updateCall(
    call.id,
    {
      state: 'ended',
      endedAt: deps.now(),
      error: cleanupPending ? 'cleanup_pending' : null,
      updatedAt: deps.now(),
    },
    { states: ['active', 'connecting', 'ringing', 'authorizing'] },
  )
  if (saved === undefined) return conflict('This call has already ended.')
  if (!cleanupPending) return ok(saved)
  return retryHangupCleanup(deps, saved, actorId)
}

async function retryHangupCleanup(
  deps: VoiceEngineDeps,
  call: VoiceCall,
  actorId: string,
): Promise<VoiceResult<VoiceCall>> {
  if (deps.provider === null) return conflict('The provider is unavailable for call cleanup.')
  await hangupProviderLegs(deps, call, actorId)
  const cleared = await deps.repo.updateCall(
    call.id,
    { error: null, updatedAt: deps.now() },
    { states: ['ended'], updatedAt: call.updatedAt },
  )
  return cleared === undefined ? conflict('Call cleanup is still being reconciled.') : ok(cleared)
}

async function hangupProviderLegs(deps: VoiceEngineDeps, call: VoiceCall, actorId: string): Promise<void> {
  const provider = deps.provider
  if (provider === null) return
  const legs = await deps.repo.listCallLegs(call.id)
  const providerIds = new Set(
    [call.providerCallId, call.providerBrowserCallId, ...legs.map((leg) => leg.providerCallId)].filter(
      (id): id is string => id !== null,
    ),
  )
  await Promise.all(
    [...providerIds].map((providerCallId) =>
      provider.command({ action: 'hangup', call, userId: actorId, providerCallId }),
    ),
  )
}

/** Save the call outcome and follow-up fields after the call has ended. */
export async function wrapupCall(
  deps: VoiceEngineDeps,
  call: VoiceCall,
  action: Extract<z.output<typeof voiceCallActionSchema>, { action: 'wrapup' }>,
): Promise<VoiceResult<VoiceCall>> {
  if (!['ended', 'failed', 'missed'].includes(call.state)) return conflict('Wrap up after the call ends.')
  const updated = await deps.repo.updateCall(
    call.id,
    {
      outcome: action.outcome,
      notes: action.notes?.trim() ?? null,
      nextActionAt: action.nextActionAt ?? null,
      appointmentAt: action.appointmentAt ?? null,
      updatedAt: deps.now(),
    },
    { updatedAt: call.updatedAt },
  )
  return updated === undefined ? conflict('This call changed while you were updating it.') : ok(updated)
}
