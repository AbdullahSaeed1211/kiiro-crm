import type { VoiceEvent } from '@ops/module-crm'
import { verifyVoiceClientState } from '@ops/module-crm'
import type { VoiceEventProcessorDeps, VoiceEventProcessorResult } from './processor-types'
import { processOutboundStart, processInboundStart, markDeviceLegRinging, fallbackCall } from './process-start'
import { processAnswered, processHangup, processRecordingSaved } from './process-call-events'
import { eventText } from './process-leg-effects'

const EVENT_LEASE_MS = 30_000
const MAX_EVENT_ATTEMPTS = 8

/** Leases durable events and leaves unsuccessful work recoverable by the queue. */
export async function processVoiceEvents(
  deps: VoiceEventProcessorDeps,
  limit = 25,
): Promise<VoiceEventProcessorResult> {
  const now = deps.now()
  const leaseUntil = now + EVENT_LEASE_MS
  const events = await deps.repo.leaseEvents(now, leaseUntil, Math.min(100, Math.max(1, limit)))
  let processed = 0
  let failed = 0
  for (const event of events) {
    try {
      await processEvent(deps, event)
      await deps.repo.finishEvent(event.id, leaseUntil, { status: 'processed' })
      processed += 1
    } catch (error) {
      const exhausted = event.attempts >= MAX_EVENT_ATTEMPTS
      const message = error instanceof Error ? error.name : 'Voice event processing failed'
      await deps.repo.finishEvent(event.id, leaseUntil, { status: exhausted ? 'failed' : 'pending', error: message })
      failed += 1
    }
  }
  return { leased: events.length, processed, failed }
}

async function processEvent(deps: VoiceEventProcessorDeps, event: VoiceEvent): Promise<void> {
  const providerCallId = eventText(event.payload.call_control_id)
  if (event.kind === 'call.initiated') return processInitiated(deps, event, providerCallId)
  if (providerCallId === undefined) return
  const input = { event, providerCallId }
  switch (event.kind) {
    case 'call.answered':
      return processAnswered(deps, input)
    case 'call.hangup':
      return processHangup(deps, input)
    case 'call.recording.saved':
      return processRecordingSaved(deps, input)
  }
}

async function processInitiated(deps: VoiceEventProcessorDeps, event: VoiceEvent, providerCallId: string | undefined) {
  const encoded = eventText(event.payload.client_state)
  const state =
    encoded === undefined ? undefined : await verifyVoiceClientState(deps.offerSigningSecret, encoded, deps.now())
  switch (state?.kind) {
    case 'outbound-browser':
      return processOutboundStart(deps, { event, payload: event.payload, state, providerCallId })
    case 'inbound-device':
      return markDeviceLegRinging(deps, { payload: event.payload, state, providerCallId })
    case 'outbound-pstn':
      return
  }
  return processUnmatchedInitiated(deps, event, providerCallId)
}

async function processUnmatchedInitiated(
  deps: VoiceEventProcessorDeps,
  event: VoiceEvent,
  providerCallId: string | undefined,
) {
  if (providerCallId !== undefined && event.payload.connection_id === deps.connectionId) {
    await deps.provider.command({
      action: 'hangup',
      call: fallbackCall(event, providerCallId),
      userId: 'system',
      providerCallId,
    })
    return
  }
  return processInboundStart(deps, { event, payload: event.payload, providerCallId })
}
