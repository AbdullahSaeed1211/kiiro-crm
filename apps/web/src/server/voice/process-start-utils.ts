import type { VoiceCall, VoiceEvent } from '@ops/module-crm'
import type { VoiceEventProcessorDeps } from './processor-types'

/** Send a provider command and let durable event retry handle failures. */
export async function safeCommand(
  deps: VoiceEventProcessorDeps,
  input: { action: 'answer' | 'decline' | 'hangup'; call: VoiceCall; providerCallId: string; userId: string },
): Promise<void> {
  await deps.provider.command(input)
}

/** Convert untrusted provider payload values into nonempty strings. */
export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Build a minimal call shape for hanging up an unauthorized provider leg. */
export function fallbackCall(event: VoiceEvent, providerCallId: string): VoiceCall {
  const payload = event.payload
  const now = event.receivedAt
  return {
    id: `unmatched-${providerCallId}`,
    requestKey: event.eventKey,
    direction: 'inbound',
    numberId: '',
    from: stringValue(payload.from) ?? '',
    to: stringValue(payload.to) ?? '',
    userId: null,
    assignedUserIds: [],
    leadId: null,
    state: 'failed',
    createdAt: now,
    answeredAt: null,
    endedAt: now,
    updatedAt: now,
    lastEventAt: now,
    providerCallId,
    providerBrowserCallId: null,
    providerSessionId: null,
    recordingId: null,
    recordingFileId: null,
    recordingState: 'off',
    outcome: null,
    notes: null,
    nextActionAt: null,
    appointmentAt: null,
    error: null,
  }
}
