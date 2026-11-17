import type { VoiceCall, VoiceDialResult, VoiceNumber, VoiceSettings } from './voice-contracts'
import { ok } from '@ops/kernel'
import { voiceDialSchema } from './voice-schema'
import {
  canManage,
  conflict,
  forbidden,
  parse,
  unavailable,
  type VoiceEngineDeps,
  type VoiceResult,
} from './voice-core'
import { signVoiceClientState } from './voice-security'
import { issueDeviceSession } from './voice-calls'
import type { z } from 'zod'

type DialInput = z.output<typeof voiceDialSchema>

interface DialContext {
  readonly number: VoiceNumber
  readonly settings: VoiceSettings
}

/** Reserve a server-authorized outbound call and return a parked browser call state. */
export async function startVoiceCall(deps: VoiceEngineDeps, input: unknown): Promise<VoiceResult<VoiceDialResult>> {
  const parsed = parse(voiceDialSchema, input)
  if (!parsed.ok) return parsed
  if (!deps.configured || deps.provider === null || deps.mode === 'disabled') return unavailable()
  const actorId = String(deps.actor.id)
  const existing = await reuseOutboundCall(deps, parsed.value, actorId)
  if (existing !== undefined) return existing
  return createOutboundCall(deps, parsed.value, actorId)
}

async function reuseOutboundCall(
  deps: VoiceEngineDeps,
  input: DialInput,
  actorId: string,
): Promise<VoiceResult<VoiceDialResult> | undefined> {
  const existing = await deps.repo.findCallByRequestKey(actorId, input.requestKey)
  if (existing === undefined) return undefined
  if (existing.state !== 'authorizing' || existing.to !== input.to || existing.numberId !== input.numberId)
    return conflict('This request key has already been used for a different call.')
  const deviceSession = await requestDeviceSession(deps, input.deviceId, actorId)
  if (deviceSession === undefined) return unavailable()
  const { session, credentialId } = deviceSession
  const clientState = await signVoiceClientState(deps.offerSigningSecret, {
    v: 1,
    kind: 'outbound-browser',
    callId: existing.id,
    deviceId: input.deviceId,
    userId: actorId,
    numberId: existing.numberId,
    credentialId,
    from: existing.from,
    to: existing.to,
    exp: Math.min(session.expiresAt, deps.now() + 5 * 60_000),
  })
  return ok({ call: existing, session, browserDestination: existing.to, clientState })
}

async function createOutboundCall(
  deps: VoiceEngineDeps,
  input: DialInput,
  actorId: string,
): Promise<VoiceResult<VoiceDialResult>> {
  const context = await resolveDialContext(deps, input, actorId)
  if (!context.ok) return context
  const deviceSession = await requestDeviceSession(deps, input.deviceId, actorId)
  if (deviceSession === undefined) return unavailable()
  const { session, credentialId } = deviceSession
  const now = deps.now()
  const call = createOutboundRecord({ input, actorId, context: context.value, now })
  const saved = await deps.repo.reserveCall(call, context.value.settings.maxConcurrentCalls)
  if (saved === undefined) return conflict('You have reached the concurrent call limit.')
  if (
    saved.state !== 'authorizing' ||
    saved.to !== input.to ||
    saved.numberId !== context.value.number.id ||
    saved.userId !== actorId
  )
    return conflict('This request key has already been used for another call.')
  return dialResult({ deps, call: saved, session, credentialId, deviceId: input.deviceId, actorId })
}

async function resolveDialContext(
  deps: VoiceEngineDeps,
  input: DialInput,
  actorId: string,
): Promise<VoiceResult<DialContext>> {
  const number = await deps.repo.getNumber(input.numberId)
  if (number?.status !== 'active' || !number.outboundEnabled)
    return conflict('Choose an active number enabled for outbound calls.')
  if (!canManage(deps.actor.role) && !number.assigneeIds.includes(actorId)) return forbidden()
  const settings = await deps.repo.loadSettings()
  if (!settings.enabled) return unavailable()
  if (!(await canUseLead(deps, input, actorId))) return forbidden()
  return ok({ number, settings })
}

async function canUseLead(deps: VoiceEngineDeps, input: DialInput, actorId: string): Promise<boolean> {
  return input.leadId === undefined || deps.repo.canReadLead(actorId, input.leadId)
}

async function requestDeviceSession(deps: VoiceEngineDeps, deviceId: string, userId: string) {
  try {
    const session = await issueDeviceSession(deps, deviceId)
    const device = await deps.repo.getDevice(userId, deviceId)
    return device === undefined ? undefined : { session, credentialId: device.providerCredentialId }
  } catch {
    return undefined
  }
}

function createOutboundRecord({
  input,
  actorId,
  context,
  now,
}: {
  input: DialInput
  actorId: string
  context: DialContext
  now: number
}): VoiceCall {
  return {
    id: crypto.randomUUID(),
    requestKey: input.requestKey,
    direction: 'outbound',
    numberId: context.number.id,
    from: context.number.e164,
    to: input.to,
    userId: actorId,
    assignedUserIds: [actorId],
    leadId: input.leadId ?? null,
    state: 'authorizing',
    createdAt: now,
    answeredAt: null,
    endedAt: null,
    updatedAt: now,
    lastEventAt: now,
    providerCallId: null,
    providerBrowserCallId: null,
    providerSessionId: null,
    recordingId: null,
    recordingFileId: null,
    recordingState: context.settings.recordingEnabled && context.number.recordingEnabled ? 'pending' : 'off',
    outcome: null,
    notes: null,
    nextActionAt: null,
    appointmentAt: null,
    error: null,
  }
}

async function dialResult({
  deps,
  call,
  session,
  credentialId,
  deviceId,
  actorId,
}: {
  deps: VoiceEngineDeps
  call: VoiceCall
  session: Awaited<ReturnType<typeof issueDeviceSession>>
  credentialId: string
  deviceId: string
  actorId: string
}): Promise<VoiceResult<VoiceDialResult>> {
  const clientState = await signVoiceClientState(deps.offerSigningSecret, {
    v: 1,
    kind: 'outbound-browser',
    callId: call.id,
    deviceId,
    userId: actorId,
    numberId: call.numberId,
    credentialId,
    from: call.from,
    to: call.to,
    exp: Math.min(session.expiresAt, deps.now() + 5 * 60_000),
  })
  return ok({ call, session, browserDestination: call.to, clientState })
}
