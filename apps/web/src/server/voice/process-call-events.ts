import type { VoiceCall } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'
import { ACTIVE_VOICE_STATES } from './processor-types'
import { callEndsWithLeg, endCallLegs, eventText, savedLeg, type CallEvent } from './process-leg-effects'

async function bridgeOutbound(deps: VoiceEventProcessorDeps, call: VoiceCall, providerCallId: string): Promise<void> {
  const browserId = call.providerBrowserCallId
  if (browserId === null) throw new Error('Browser leg is not saved yet')
  const browser = (await deps.repo.listCallLegs(call.id)).find((leg) => leg.providerCallId === browserId)
  if (browser === undefined) throw new Error('Browser leg is not saved yet')
  await deps.provider.bridge({
    firstCallId: browserId,
    secondCallId: providerCallId,
    commandKey: `${call.id}-outbound-bridge`,
  })
  await deps.repo.updateCallLeg(browser.id, { state: 'bridged', updatedAt: deps.now() }, [
    'ringing',
    'answered',
    'bridged',
  ])
}

/** Applies an answer only to a saved, nonterminal call leg. */
export async function processAnswered(deps: VoiceEventProcessorDeps, input: CallEvent): Promise<void> {
  const saved = await savedLeg(deps, input.providerCallId)
  if (saved === undefined) throw new Error('Answered leg is not saved yet')
  const { leg, call } = saved
  if (!ACTIVE_VOICE_STATES.includes(call.state as (typeof ACTIVE_VOICE_STATES)[number])) return
  await deps.repo.updateCallLeg(leg.id, { state: 'answered', updatedAt: deps.now() }, [
    'dialing',
    'ringing',
    'answered',
  ])
  if (leg.kind === 'outbound-browser' || leg.kind === 'inbound-caller') return
  if (leg.kind === 'outbound-pstn') await bridgeOutbound(deps, call, input.providerCallId)
  else await bridgeInbound(deps, call, { legId: leg.id, providerCallId: input.providerCallId })
  const changed = await activateCall(deps, call, input)
  await captureRecordingReference(deps, changed, input)
  await deps.enqueueReconcile(call.id, (await deps.repo.loadSettings()).maxCallSeconds)
}

async function bridgeInbound(
  deps: VoiceEventProcessorDeps,
  call: VoiceCall,
  device: { legId: string; providerCallId: string },
) {
  if (call.providerBrowserCallId !== device.providerCallId || call.providerCallId === null) {
    throw new Error('Inbound answer claim is not saved yet')
  }
  await deps.provider.bridge({
    firstCallId: call.providerCallId,
    secondCallId: device.providerCallId,
    commandKey: `${call.id}-inbound-bridge`,
  })
  await deps.repo.updateCallLeg(device.legId, { state: 'bridged', updatedAt: deps.now() }, [
    'ringing',
    'answered',
    'bridged',
  ])
  const caller = await deps.repo.getCallLeg(call.id, null, 'inbound-caller')
  if (caller !== undefined)
    await deps.repo.updateCallLeg(caller.id, { state: 'bridged', updatedAt: deps.now() }, [
      'ringing',
      'answered',
      'bridged',
    ])
}

function activateCall(deps: VoiceEventProcessorDeps, call: VoiceCall, input: CallEvent) {
  return deps.repo.updateCall(
    call.id,
    {
      state: 'active',
      answeredAt: call.answeredAt ?? input.event.occurredAt,
      lastEventAt: Math.max(call.lastEventAt, input.event.occurredAt),
      updatedAt: deps.now(),
    },
    { states: ['connecting', 'active'] },
  )
}

async function captureRecordingReference(deps: VoiceEventProcessorDeps, call: VoiceCall | undefined, input: CallEvent) {
  const recordingId = eventText(input.event.payload.recording_id)
  if (call?.recordingState !== 'pending' || recordingId === undefined) return
  await deps.repo.updateCall(call.id, { recordingId, updatedAt: deps.now() }, { states: ['active'] })
}

async function markCallEnded(deps: VoiceEventProcessorDeps, call: VoiceCall, occurredAt: number): Promise<VoiceCall> {
  if (!ACTIVE_VOICE_STATES.some((state) => state === call.state)) return call
  const missed = call.answeredAt === null && call.direction === 'inbound'
  const updated = await deps.repo.updateCall(
    call.id,
    {
      state: missed ? 'missed' : 'ended',
      outcome: missed ? 'no_answer' : call.outcome,
      endedAt: occurredAt,
      lastEventAt: Math.max(call.lastEventAt, occurredAt),
      updatedAt: deps.now(),
    },
    { states: ACTIVE_VOICE_STATES, updatedAt: call.updatedAt },
  )
  if (updated === undefined) throw new Error('Call changed during hangup')
  return updated
}

/** Cleans up other legs even when an earlier attempt already saved the terminal state. */
export async function processHangup(deps: VoiceEventProcessorDeps, input: CallEvent): Promise<void> {
  const saved = await savedLeg(deps, input.providerCallId)
  if (saved === undefined) throw new Error('Ended leg is not saved yet')
  const { leg, call } = saved
  await deps.repo.updateCallLeg(leg.id, { state: 'ended', updatedAt: deps.now() }, [
    'dialing',
    'ringing',
    'answered',
    'bridged',
  ])
  if (!callEndsWithLeg(call, leg)) return
  const updated = await markCallEnded(deps, call, input.event.occurredAt)
  if (updated.state === 'missed') await deps.repo.createMissedCallFollowUp(updated)
  await endCallLegs(deps, updated, input.providerCallId)
}

/** Saves private recording media only after the verified event is linked to a saved call leg. */
export async function processRecordingSaved(deps: VoiceEventProcessorDeps, input: CallEvent): Promise<void> {
  const saved = await savedLeg(deps, input.providerCallId)
  if (saved === undefined) throw new Error('Recording leg is not saved yet')
  const recordingId = eventText(input.event.payload.recording_id)
  const { call } = saved
  if (recordingId === undefined || call.recordingState === 'off') return
  if (call.recordingState === 'ready' && call.recordingId === recordingId) return
  const updated = await deps.repo.updateCall(
    call.id,
    {
      recordingId,
      recordingState: 'pending',
      lastEventAt: Math.max(call.lastEventAt, input.event.occurredAt),
      updatedAt: deps.now(),
    },
    { updatedAt: call.updatedAt },
  )
  if (updated === undefined) throw new Error('Recording reference changed')
  if (deps.persistRecording === undefined) throw new Error('Private recording storage is unavailable')
  await deps.persistRecording(updated, recordingId, input.providerCallId)
}
