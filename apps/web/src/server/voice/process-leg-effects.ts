import type { VoiceCall, VoiceCallLeg, VoiceEvent } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'

export interface CallEvent {
  readonly event: VoiceEvent
  readonly providerCallId: string
}

/** Reads a provider string without treating arbitrary metadata as trusted identity. */
export function eventText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Loads the saved relationship between a provider leg and its CRM call. */
export async function savedLeg(deps: VoiceEventProcessorDeps, id: string) {
  const leg = await deps.repo.findCallLegByProviderId(id)
  if (leg === undefined) return undefined
  const call = await deps.repo.getCall(leg.callId)
  return call === undefined ? undefined : { leg, call }
}

/** Ends all remaining provider legs using deterministic provider command identifiers. */
export async function endCallLegs(deps: VoiceEventProcessorDeps, call: VoiceCall, except?: string): Promise<void> {
  const legs = await deps.repo.listCallLegs(call.id)
  const providerIds = [call.providerCallId, call.providerBrowserCallId, ...legs.map((leg) => leg.providerCallId)]
  const ids = new Set(providerIds.filter((id): id is string => id !== null && id !== except))
  await Promise.all(
    [...ids].map((providerCallId) =>
      deps.provider.command({
        action: 'hangup',
        call,
        userId: 'system',
        providerCallId,
      }),
    ),
  )
}

/** A losing inbound device must not end another user's accepted call. */
export function callEndsWithLeg(call: VoiceCall, leg: VoiceCallLeg): boolean {
  if (leg.kind !== 'inbound-device') return true
  return call.direction === 'inbound' && call.userId !== null && call.providerBrowserCallId === leg.providerCallId
}
