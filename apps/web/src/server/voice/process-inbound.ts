import type { VoiceCall, VoiceDevice, VoiceEvent, VoiceNumber, VoiceSettings } from '@ops/module-crm'
import { signVoiceClientState } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'
import { fallbackCall, safeCommand, stringValue } from './process-start-utils'
import { fallbackInboundCall } from './process-fallback'

const DEVICE_LEASE_MS = 120_000

interface InboundInput {
  readonly event: VoiceEvent
  readonly payload: Record<string, unknown>
  readonly providerCallId: string | undefined
}

interface InboundContext {
  readonly number: VoiceNumber
  readonly settings: VoiceSettings
  readonly providerCallId: string
  readonly from: string
  readonly to: string
  readonly now: number
}

interface RingingContext extends InboundContext {
  readonly call: VoiceCall
}

/** Create or resume an inbound call and ring each currently assigned browser device. */
export async function processInboundStart(deps: VoiceEventProcessorDeps, input: InboundInput): Promise<void> {
  const context = await inboundContext(deps, input)
  if (context === undefined) {
    await rejectInbound(deps, input)
    return
  }
  const call = await reserveInboundCall(deps, context, input.event)
  if (call === undefined) return
  await reserveCallerLeg(deps, { call, providerCallId: context.providerCallId, now: context.now })
  const devices = await eligibleDevices(deps, context.number, context.now)
  await ringDevices(deps, { ...context, call }, devices)
  if (devices.length === 0) {
    await fallbackInboundCall(deps, call, context.settings)
    return
  }
  await deps.enqueueReconcile(call.id, context.settings.ringSeconds)
}

async function inboundContext(deps: VoiceEventProcessorDeps, input: InboundInput): Promise<InboundContext | undefined> {
  const from = stringValue(input.payload.from)
  const to = stringValue(input.payload.to)
  if (
    input.providerCallId === undefined ||
    from === undefined ||
    to === undefined ||
    stringValue(input.payload.connection_id) !== deps.applicationId
  )
    return undefined
  const number = await activeInboundNumber(deps, to)
  const settings = await deps.repo.loadSettings()
  if (number === undefined || !settings.enabled) return undefined
  return { number, settings, providerCallId: input.providerCallId, from, to, now: deps.now() }
}

async function activeInboundNumber(deps: VoiceEventProcessorDeps, e164: string): Promise<VoiceNumber | undefined> {
  return (await deps.repo.listNumbers()).find(
    (number) => number.e164 === e164 && number.status === 'active' && number.inboundEnabled,
  )
}

async function reserveInboundCall(
  deps: VoiceEventProcessorDeps,
  context: InboundContext,
  event: VoiceEvent,
): Promise<VoiceCall | undefined> {
  const call = createInboundRecord(context, event)
  const saved = await deps.repo.reserveCall(call, context.settings.maxConcurrentCalls)
  if (saved === undefined) return undefined
  if (saved.id !== call.id) {
    if (saved.state === 'missed' && saved.error === 'fallback_pending')
      await fallbackInboundCall(deps, saved, context.settings)
    if (saved.state !== 'ringing') return undefined
  }
  return saved
}

function createInboundRecord(context: InboundContext, event: VoiceEvent): VoiceCall {
  const { number, providerCallId, from, to, now, settings } = context
  return {
    id: crypto.randomUUID(),
    requestKey: `telnyx:${event.eventKey}`,
    direction: 'inbound',
    numberId: number.id,
    from,
    to,
    userId: null,
    assignedUserIds: [...number.assigneeIds],
    leadId: null,
    state: 'ringing',
    createdAt: now,
    answeredAt: null,
    endedAt: null,
    updatedAt: now,
    lastEventAt: event.occurredAt,
    providerCallId,
    providerBrowserCallId: null,
    providerSessionId: stringValue(event.payload.call_session_id) ?? null,
    recordingId: null,
    recordingFileId: null,
    recordingState: settings.recordingEnabled && number.recordingEnabled ? 'pending' : 'off',
    outcome: null,
    notes: null,
    nextActionAt: null,
    appointmentAt: null,
    error: null,
  }
}

async function reserveCallerLeg(
  deps: VoiceEventProcessorDeps,
  { call, providerCallId, now }: { call: VoiceCall; providerCallId: string; now: number },
): Promise<void> {
  await deps.repo.reserveCallLeg({
    id: crypto.randomUUID(),
    callId: call.id,
    deviceId: null,
    kind: 'inbound-caller',
    providerCallId,
    state: 'ringing',
    createdAt: now,
    updatedAt: now,
  })
}

async function eligibleDevices(
  deps: VoiceEventProcessorDeps,
  number: VoiceNumber,
  now: number,
): Promise<VoiceDevice[]> {
  const devices = await deps.repo.listDevices(number.assigneeIds)
  const eligible: VoiceDevice[] = []
  for (const device of devices) {
    const current =
      device.expiresAt > now && now - device.lastSeenAt <= DEVICE_LEASE_MS && number.assigneeIds.includes(device.userId)
    if (current && (await deps.repo.isActiveUser(device.userId))) eligible.push(device)
  }
  return eligible
}

async function ringDevices(
  deps: VoiceEventProcessorDeps,
  context: RingingContext,
  devices: readonly VoiceDevice[],
): Promise<void> {
  for (const device of devices) await ringDevice(deps, context, device)
}

async function ringDevice(deps: VoiceEventProcessorDeps, context: RingingContext, device: VoiceDevice): Promise<void> {
  const leg = await deps.repo.reserveCallLeg({
    id: crypto.randomUUID(),
    callId: context.call.id,
    deviceId: device.deviceId,
    kind: 'inbound-device',
    providerCallId: null,
    state: 'dialing',
    createdAt: context.now,
    updatedAt: context.now,
  })
  if (leg.providerCallId !== null) return
  if (leg.state === 'failed')
    await deps.repo.updateCallLeg(leg.id, { state: 'dialing', updatedAt: deps.now() }, ['failed'])
  const state = await signedInboundDeviceState(deps, context, device)
  try {
    const providerCallId = await deps.provider.dialInboundDevice({
      call: context.call,
      device,
      clientState: state,
      timeoutSeconds: context.settings.ringSeconds,
    })
    await deps.repo.updateCallLeg(leg.id, { providerCallId, state: 'ringing', updatedAt: deps.now() }, ['dialing'])
  } catch (error) {
    await deps.repo.updateCallLeg(leg.id, { state: 'failed', updatedAt: deps.now() }, ['dialing'])
    throw error
  }
}

async function signedInboundDeviceState(
  deps: VoiceEventProcessorDeps,
  context: RingingContext,
  device: VoiceDevice,
): Promise<string> {
  return signVoiceClientState(deps.offerSigningSecret, {
    v: 1,
    kind: 'inbound-device',
    callId: context.call.id,
    deviceId: device.deviceId,
    userId: device.userId,
    numberId: context.number.id,
    from: context.from,
    to: context.to,
    exp: context.now + (context.settings.ringSeconds + 30) * 1000,
  })
}

async function rejectInbound(deps: VoiceEventProcessorDeps, input: InboundInput): Promise<void> {
  if (input.providerCallId === undefined) return
  await safeCommand(deps, {
    action: 'hangup',
    call: fallbackCall(input.event, input.providerCallId),
    providerCallId: input.providerCallId,
    userId: 'system',
  })
}

export { markDeviceLegRinging } from './process-inbound-device'
