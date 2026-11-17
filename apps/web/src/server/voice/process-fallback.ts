import type { VoiceCall, VoiceSettings } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'

async function claimFallback(deps: VoiceEventProcessorDeps, call: VoiceCall, settings: VoiceSettings) {
  if (call.state !== 'ringing') return call.state === 'missed' && call.error === 'fallback_pending' ? call : undefined
  return deps.repo.updateCall(
    call.id,
    {
      state: 'missed',
      outcome: 'no_answer',
      endedAt: deps.now(),
      error: 'fallback_pending',
      updatedAt: deps.now(),
      recordingState: settings.fallback === 'voicemail' ? 'pending' : call.recordingState,
      nextActionAt: call.leadId === null ? null : deps.now() + 24 * 60 * 60_000,
    },
    { states: ['ringing'], updatedAt: call.updatedAt },
  )
}

/** Atomically claims an unanswered inbound call before routing it to voicemail or forwarding. */
export async function fallbackInboundCall(
  deps: VoiceEventProcessorDeps,
  call: VoiceCall,
  settings: VoiceSettings,
): Promise<void> {
  const claimed = await claimFallback(deps, call, settings)
  if (claimed === undefined) return
  await deps.provider.fallbackInbound({
    call: claimed,
    forwardingNumber: settings.fallback === 'forward' ? settings.forwardingNumber : null,
  })
  const saved = await deps.repo.updateCall(
    claimed.id,
    {
      error: 'fallback_active',
      endedAt: deps.now(),
      updatedAt: deps.now(),
    },
    { states: ['missed'], updatedAt: claimed.updatedAt },
  )
  await deps.repo.createMissedCallFollowUp(saved ?? claimed)
  await deps.enqueueReconcile(claimed.id, settings.fallback === 'voicemail' ? 60 : settings.maxCallSeconds)
}
