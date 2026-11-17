import type { VoiceCall, VoiceDevice, VoiceEvent, VoiceNumber } from '@ops/module-crm'
import { signVoiceClientState } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'
import { fallbackCall, safeCommand, stringValue } from './process-start-utils'

const DEVICE_LEASE_MS = 120_000

interface OutboundInput {
  readonly event: VoiceEvent
  readonly payload: Record<string, unknown>
  readonly state: Record<string, unknown>
  readonly providerCallId: string | undefined
}

interface OutboundContext {
  readonly call: VoiceCall
  readonly device: VoiceDevice
  readonly number: VoiceNumber
  readonly userId: string
  readonly deviceId: string
  readonly providerCallId: string
}

/** Authorize the signed browser leg, then idempotently start its PSTN leg. */
export async function processOutboundStart(deps: VoiceEventProcessorDeps, input: OutboundInput): Promise<void> {
  const context = await authorizedOutboundContext(deps, input)
  if (context === undefined) {
    await rejectOutboundLeg(deps, { input })
    return
  }
  await continueOutboundStart(deps, context, input)
}

async function continueOutboundStart(
  deps: VoiceEventProcessorDeps,
  context: OutboundContext,
  input: OutboundInput,
): Promise<void> {
  if (sameActiveBrowserLeg(context.call, context.providerCallId)) return
  if (context.call.state === 'connecting' && context.call.providerBrowserCallId !== context.providerCallId) {
    await rejectOutboundLeg(deps, { input, call: context.call, userId: context.userId })
    return
  }
  const started = await beginOutboundCall(deps, context, input.event)
  if (started === undefined) {
    await rejectOutboundLeg(deps, { input, call: context.call, userId: context.userId })
    return
  }
  if (!(await reserveBrowserLeg(deps, context))) {
    await rejectOutboundLeg(deps, { input, call: started, userId: context.userId })
    return
  }
  await answerAndStartPstn(deps, { context, call: started, event: input.event })
}

async function authorizedOutboundContext(
  deps: VoiceEventProcessorDeps,
  input: OutboundInput,
): Promise<OutboundContext | undefined> {
  const identity = outboundIdentity(input)
  if (identity === undefined) return undefined
  const call = await deps.repo.getCall(identity.callId)
  if (call === undefined || !matchesCallReservation(call, input.state)) return undefined
  return loadOutboundContext(deps, { call, identity, input })
}

function outboundIdentity(
  input: OutboundInput,
): { userId: string; deviceId: string; callId: string; providerCallId: string } | undefined {
  const userId = stringValue(input.state.userId)
  const deviceId = stringValue(input.state.deviceId)
  const callId = stringValue(input.state.callId)
  const providerCallId = input.providerCallId
  if (userId === undefined || deviceId === undefined || callId === undefined || providerCallId === undefined)
    return undefined
  return { userId, deviceId, callId, providerCallId }
}

async function loadOutboundContext(
  deps: VoiceEventProcessorDeps,
  values: {
    call: VoiceCall
    identity: { userId: string; deviceId: string; callId: string; providerCallId: string }
    input: OutboundInput
  },
): Promise<OutboundContext | undefined> {
  const { call, identity, input } = values
  const device = await deps.repo.getDevice(identity.userId, identity.deviceId)
  if (!matchesCredential(device, input.state.credentialId) || !(await isCurrentDevice(deps, device, identity.userId)))
    return undefined
  const number = await deps.repo.getNumber(call.numberId)
  if (number === undefined) return undefined
  if (!matchesBrowserEvent({ call, number, payload: input.payload, connectionId: deps.connectionId })) return undefined
  return { call, device, number, ...identity }
}

function matchesCallReservation(call: VoiceCall, state: Record<string, unknown>): boolean {
  return (
    call.direction === 'outbound' &&
    ['authorizing', 'connecting', 'active'].includes(call.state) &&
    call.userId === state.userId &&
    call.from === state.from &&
    call.to === state.to &&
    call.numberId === state.numberId
  )
}

function matchesCredential(device: VoiceDevice | undefined, credentialId: unknown): device is VoiceDevice {
  return device !== undefined && typeof credentialId === 'string' && credentialId === device.providerCredentialId
}

function matchesBrowserEvent(input: {
  call: VoiceCall
  number: VoiceNumber | undefined
  payload: Record<string, unknown>
  connectionId: string
}): boolean {
  const { call, number, payload } = input
  return (
    number?.status === 'active' &&
    number.outboundEnabled &&
    number.assigneeIds.includes(call.userId ?? '') &&
    stringValue(payload.connection_id) === input.connectionId &&
    stringValue(payload.from) === call.from &&
    stringValue(payload.to) === call.to
  )
}

async function isCurrentDevice(deps: VoiceEventProcessorDeps, device: VoiceDevice, userId: string): Promise<boolean> {
  const now = deps.now()
  return device.expiresAt > now && now - device.lastSeenAt <= DEVICE_LEASE_MS && deps.repo.isActiveUser(userId)
}

function sameActiveBrowserLeg(call: VoiceCall, providerCallId: string): boolean {
  return call.state === 'active' && call.providerBrowserCallId === providerCallId
}

async function beginOutboundCall(
  deps: VoiceEventProcessorDeps,
  context: OutboundContext,
  event: VoiceEvent,
): Promise<VoiceCall | undefined> {
  const { call, providerCallId } = context
  if (call.state === 'connecting') return call.providerBrowserCallId === providerCallId ? call : undefined
  const started = await deps.repo.updateCall(
    call.id,
    {
      state: 'connecting',
      providerBrowserCallId: providerCallId,
      lastEventAt: Math.max(call.lastEventAt, event.occurredAt),
      updatedAt: deps.now(),
    },
    { states: ['authorizing'] },
  )
  if (started !== undefined) return started
  const raced = await deps.repo.getCall(call.id)
  return raced?.state === 'connecting' && raced.providerBrowserCallId === providerCallId ? raced : undefined
}

async function reserveBrowserLeg(deps: VoiceEventProcessorDeps, context: OutboundContext): Promise<boolean> {
  const leg = await deps.repo.reserveCallLeg({
    id: crypto.randomUUID(),
    callId: context.call.id,
    deviceId: context.deviceId,
    kind: 'outbound-browser',
    providerCallId: context.providerCallId,
    state: 'ringing',
    createdAt: deps.now(),
    updatedAt: deps.now(),
  })
  return leg.providerCallId === context.providerCallId
}

async function answerAndStartPstn(
  deps: VoiceEventProcessorDeps,
  input: { context: OutboundContext; call: VoiceCall; event: VoiceEvent },
): Promise<void> {
  const { context, call, event } = input
  await deps.provider.command({
    action: 'answer',
    call,
    userId: context.userId,
    providerCallId: context.providerCallId,
  })
  const settings = await deps.repo.loadSettings()
  const token = await signedPstnState(deps, context)
  const leg = await reservePstnLeg(deps, context.call.id)
  if (leg.providerCallId !== null) return
  const providerCallId = await deps.provider.dialPstn({
    call,
    browserCallId: context.providerCallId,
    clientState: token,
    timeLimitSeconds: settings.maxCallSeconds,
  })
  await deps.repo.updateCallLeg(leg.id, { providerCallId, state: 'dialing', updatedAt: deps.now() }, ['dialing'])
  await deps.repo.updateCall(
    call.id,
    {
      providerCallId,
      lastEventAt: Math.max(call.lastEventAt, event.occurredAt),
      updatedAt: deps.now(),
    },
    { states: ['connecting'] },
  )
  await deps.enqueueReconcile(call.id, settings.maxCallSeconds)
}

async function signedPstnState(deps: VoiceEventProcessorDeps, context: OutboundContext): Promise<string> {
  return signVoiceClientState(deps.offerSigningSecret, {
    v: 1,
    kind: 'outbound-pstn',
    callId: context.call.id,
    userId: context.userId,
    deviceId: context.deviceId,
    from: context.call.from,
    to: context.call.to,
    exp: deps.now() + 5 * 60_000,
  })
}

async function reservePstnLeg(deps: VoiceEventProcessorDeps, callId: string) {
  return deps.repo.reserveCallLeg({
    id: crypto.randomUUID(),
    callId,
    deviceId: null,
    kind: 'outbound-pstn',
    providerCallId: null,
    state: 'dialing',
    createdAt: deps.now(),
    updatedAt: deps.now(),
  })
}

async function rejectOutboundLeg(
  deps: VoiceEventProcessorDeps,
  options: { input: OutboundInput; call?: VoiceCall; userId?: string },
): Promise<void> {
  const { input, call, userId } = options
  const providerCallId = input.providerCallId
  if (providerCallId === undefined) return
  await safeCommand(deps, {
    action: 'hangup',
    call: call ?? fallbackCall(input.event, providerCallId),
    providerCallId,
    userId: userId ?? 'system',
  })
}
