import type { Actor } from '@ops/platform'
import type { VoiceCall, VoiceClientSession, VoiceDevice, VoiceMode, VoiceSnapshot } from './voice-contracts'
import type { VoiceProvider } from './ports/voice-provider'
import { voiceCallActionSchema, voiceSessionSchema } from './voice-schema'
import { canManage, forbidden, parse, unavailable, type VoiceEngineDeps, type VoiceResult } from './voice-core'
import { domainError, err, ok } from '@ops/kernel'
import { answerInboundCall, declineInboundCall, hangupCall, wrapupCall } from './voice-call-actions'

/** Check whether actor ownership or management access makes a call visible. */
function visibleCall(call: VoiceCall, actor: Actor, manager: boolean): boolean {
  return manager || call.userId === String(actor.id) || call.assignedUserIds.includes(String(actor.id))
}

/** Include inbound calls that ring a line assigned to the actor. */
async function canAccessCall(deps: VoiceEngineDeps, call: VoiceCall, manager: boolean): Promise<boolean> {
  if (visibleCall(call, deps.actor, manager)) return true
  if (call.direction !== 'inbound') return false
  const number = await deps.repo.getNumber(call.numberId)
  return number?.status === 'active' && number.inboundEnabled && number.assigneeIds.includes(String(deps.actor.id))
}

/** Keep one active provider credential per authenticated user and browser device. */
export async function issueDeviceSession(deps: VoiceEngineDeps, deviceId: string): Promise<VoiceClientSession> {
  const userId = String(deps.actor.id)
  const device = await getOrCreateDevice(deps, userId, deviceId)
  if (device.expiresAt <= deps.now()) throw new Error('voice device credential has expired')
  const provider = deps.provider
  if (provider === null) throw new Error('voice provider is unavailable')
  const session = await provider.issueSession({ device })
  if (session.deviceId !== deviceId || session.expiresAt <= deps.now())
    throw new Error('voice provider returned an invalid session')
  return session
}

async function getOrCreateDevice(deps: VoiceEngineDeps, userId: string, deviceId: string): Promise<VoiceDevice> {
  const existing = await deps.repo.getDevice(userId, deviceId)
  if (existing !== undefined && existing.expiresAt > deps.now()) {
    const refreshed = { ...existing, lastSeenAt: deps.now() }
    await deps.repo.saveDevice(refreshed)
    return refreshed
  }
  const provider = deps.provider
  if (provider === null) throw new Error('voice provider is unavailable')
  if (existing !== undefined) await provider.revokeDeviceCredential(existing)
  const credential = await provider.createDeviceCredential({ userId, deviceId })
  if (credential.userId !== userId || credential.deviceId !== deviceId)
    throw new Error('voice provider returned a credential for another device')
  const device = existing === undefined ? credential : { ...credential, id: existing.id, key: existing.key }
  await deps.repo.saveDevice(device)
  return device
}

/** Build the signed-in user's permission-filtered calling view. */
export async function voiceSnapshot(deps: VoiceEngineDeps): Promise<VoiceResult<VoiceSnapshot>> {
  const userId = String(deps.actor.id)
  const manager = canManage(deps.actor.role)
  const [settings, numbers, calls, members, devices] = await Promise.all([
    deps.repo.loadSettings(),
    deps.repo.listNumbers(),
    deps.repo.listCallsForUser(userId, manager, 100),
    manager ? deps.repo.listActiveMembers() : Promise.resolve([]),
    manager ? deps.repo.listDevices([]) : Promise.resolve([]),
  ])
  return ok({
    configured: deps.configured,
    mode: deps.configured ? deps.mode : 'disabled',
    canManage: manager,
    userId,
    settings,
    numbers: numbers.filter((number) => manager || number.assigneeIds.includes(userId)),
    calls: calls.filter((call) => visibleCall(call, deps.actor, manager)),
    ...(manager ? { devices: [...devices] } : {}),
    members: [...members],
  })
}

/** Mint a short-lived browser session for the authenticated user's device. */
export async function voiceSession(deps: VoiceEngineDeps, input: unknown): Promise<VoiceResult<VoiceClientSession>> {
  const parsed = parse(voiceSessionSchema, input)
  if (!parsed.ok) return parsed
  if (!deps.configured || deps.provider === null) return unavailable()
  if (!(await deps.repo.isActiveUser(String(deps.actor.id)))) return forbidden()
  try {
    return ok(await issueDeviceSession(deps, parsed.value.deviceId))
  } catch {
    return unavailable()
  }
}

/** Stop a browser device from receiving calls and revoke its provider credential. */
export async function stopVoiceSession(
  deps: VoiceEngineDeps,
  input: unknown,
): Promise<VoiceResult<{ readonly stopped: true }>> {
  const parsed = parse(voiceSessionSchema, input)
  if (!parsed.ok) return parsed
  const userId = String(deps.actor.id)
  const device = await deps.repo.getDevice(userId, parsed.value.deviceId)
  if (device === undefined) return ok({ stopped: true })
  await deps.repo.saveDevice({ ...device, expiresAt: deps.now(), lastSeenAt: 0 })
  if (deps.provider !== null) {
    try {
      await deps.provider.revokeDeviceCredential(device)
    } catch {
      return unavailable()
    }
  }
  return ok({ stopped: true })
}

/** Apply an authorized call action through repository compare-and-set and provider commands. */
export async function actionVoiceCall(
  deps: VoiceEngineDeps,
  callId: string,
  input: unknown,
): Promise<VoiceResult<VoiceCall>> {
  const parsed = parse(voiceCallActionSchema, input)
  if (!parsed.ok) return parsed
  const call = await deps.repo.getCall(callId)
  if (call === undefined) return err(domainError('NOT_FOUND', 'Call not found.'))
  const manager = canManage(deps.actor.role)
  if (!(await canAccessCall(deps, call, manager))) return forbidden()
  const actorId = String(deps.actor.id)
  switch (parsed.value.action) {
    case 'answer':
      return answerInboundCall({ deps, call, actorId, deviceId: parsed.value.deviceId })
    case 'decline':
      return declineInboundCall({ deps, call, actorId, deviceId: parsed.value.deviceId })
    case 'hangup':
      return hangupCall(deps, call, actorId)
    case 'wrapup':
      return wrapupCall(deps, call, parsed.value)
  }
}

/** True when a request actor may manage tenant calling configuration. */
/** Check whether the actor can manage workspace-wide calling settings. */
export function isVoiceManager(actor: Actor): boolean {
  return canManage(actor.role)
}

/** Returns the effective calling mode after provider configuration is checked. */
/** Derive advertised mode from the configured provider instance. */
export function voiceModeFor(provider: VoiceProvider | null): VoiceMode {
  return provider?.mode ?? 'disabled'
}
