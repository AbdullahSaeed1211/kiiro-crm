import type { VoiceCall, VoiceDevice, VoiceNumber } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'
import { stringValue } from './process-start-utils'

const DEVICE_LEASE_MS = 120_000

interface DeviceStateInput {
  readonly payload: Record<string, unknown>
  readonly state: Record<string, unknown>
  readonly providerCallId: string | undefined
}

/** Bind a ringing device leg to a verified server-created provider call. */
export async function markDeviceLegRinging(deps: VoiceEventProcessorDeps, input: DeviceStateInput): Promise<void> {
  const ids = signedDeviceIds(input.state, input.providerCallId)
  if (ids === undefined || stringValue(input.payload.connection_id) !== deps.applicationId) return
  const call = await deps.repo.getCall(ids.callId)
  const leg = await deps.repo.getCallLeg(ids.callId, ids.deviceId, 'inbound-device')
  const number = call === undefined ? undefined : await deps.repo.getNumber(call.numberId)
  const device = await deps.repo.getDevice(ids.userId, ids.deviceId)
  if (leg === undefined || !(await mayBindDeviceLeg({ deps, call, leg, number, device, userId: ids.userId }))) return
  await deps.repo.updateCallLeg(
    leg.id,
    { providerCallId: ids.providerCallId, state: 'ringing', updatedAt: deps.now() },
    ['dialing', 'ringing'],
  )
}

function signedDeviceIds(
  state: Record<string, unknown>,
  providerCallId: string | undefined,
): { callId: string; userId: string; deviceId: string; providerCallId: string } | undefined {
  const callId = stringValue(state.callId)
  const userId = stringValue(state.userId)
  const deviceId = stringValue(state.deviceId)
  if (callId === undefined || userId === undefined || deviceId === undefined || providerCallId === undefined)
    return undefined
  return { callId, userId, deviceId, providerCallId }
}

async function mayBindDeviceLeg(input: {
  readonly deps: VoiceEventProcessorDeps
  readonly call: VoiceCall | undefined
  readonly leg: Awaited<ReturnType<VoiceEventProcessorDeps['repo']['getCallLeg']>>
  readonly number: VoiceNumber | undefined
  readonly device: VoiceDevice | undefined
  readonly userId: string
}): Promise<boolean> {
  if (!hasRingingAssignment(input)) return false
  return isCurrentAssignedDevice(input)
}

function hasRingingAssignment(input: Parameters<typeof mayBindDeviceLeg>[0]): boolean {
  return (
    input.call?.state === 'ringing' &&
    input.leg !== undefined &&
    input.number?.inboundEnabled === true &&
    input.number.assigneeIds.includes(input.userId) &&
    input.device !== undefined
  )
}

async function isCurrentAssignedDevice(input: Parameters<typeof mayBindDeviceLeg>[0]): Promise<boolean> {
  const device = input.device
  if (device === undefined) return false
  const fresh = device.expiresAt > input.deps.now() && input.deps.now() - device.lastSeenAt <= DEVICE_LEASE_MS
  return fresh && (await input.deps.repo.isActiveUser(input.userId))
}
