import type { VoiceCall, VoiceSettings } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'
import { ACTIVE_VOICE_STATES } from './processor-types'
import { endCallLegs } from './process-leg-effects'
import { fallbackInboundCall } from './process-fallback'

function needsFallback(call: VoiceCall, settings: VoiceSettings, now: number): boolean {
  if (call.state === 'missed' && call.error === 'fallback_pending') return true
  return call.direction === 'inbound' && call.state === 'ringing' && now >= call.createdAt + settings.ringSeconds * 1000
}

async function expireCall(deps: VoiceEventProcessorDeps, call: VoiceCall): Promise<void> {
  const saved = await deps.repo.updateCall(
    call.id,
    {
      state: 'ended',
      endedAt: deps.now(),
      error: 'cleanup_pending',
      updatedAt: deps.now(),
    },
    { states: ['active', 'connecting'], updatedAt: call.updatedAt },
  )
  if (saved !== undefined) await finishCleanup(deps, saved)
}

async function finishCleanup(deps: VoiceEventProcessorDeps, call: VoiceCall): Promise<void> {
  await endCallLegs(deps, call)
  await deps.repo.updateCall(call.id, { error: null, updatedAt: deps.now() }, { updatedAt: call.updatedAt })
}

/** Reconciles timeouts using saved state; stale queue messages cannot revive a terminal call. */
export async function reconcileVoiceCall(deps: VoiceEventProcessorDeps, callId: string): Promise<void> {
  const call = await deps.repo.getCall(callId)
  if (call === undefined) return
  if (call.state === 'ended' && call.error === 'cleanup_pending') return finishCleanup(deps, call)
  const now = deps.now()
  const settings = await deps.repo.loadSettings()
  if (call.state === 'missed' && call.error === 'fallback_active') return reconcileFallback(deps, call, settings)
  if (needsFallback(call, settings, now)) return fallbackInboundCall(deps, call, settings)
  if (!ACTIVE_VOICE_STATES.some((state) => state === call.state)) return
  await reconcileOpenCall(deps, call, settings)
}

async function reconcileFallback(deps: VoiceEventProcessorDeps, call: VoiceCall, settings: VoiceSettings) {
  const duration = settings.fallback === 'voicemail' ? 60 : settings.maxCallSeconds
  const startedAt = call.endedAt ?? call.updatedAt
  const remaining = Math.ceil((startedAt + duration * 1000 - deps.now()) / 1000)
  if (remaining > 0) return deps.enqueueReconcile(call.id, remaining)
  await finishCleanup(deps, call)
}

async function reconcileOpenCall(
  deps: VoiceEventProcessorDeps,
  call: VoiceCall,
  settings: VoiceSettings,
): Promise<void> {
  const now = deps.now()
  if (call.state === 'connecting' && now >= call.createdAt + 120_000) return expireCall(deps, call)
  if (call.state === 'active' && call.answeredAt !== null && now >= call.answeredAt + settings.maxCallSeconds * 1000) {
    return expireCall(deps, call)
  }
  if (call.state === 'authorizing' && now >= call.createdAt + 60_000) {
    await deps.repo.updateCall(
      call.id,
      {
        state: 'failed',
        endedAt: now,
        error: 'browser_call_not_started',
        updatedAt: now,
      },
      { states: ['authorizing'], updatedAt: call.updatedAt },
    )
  }
}
