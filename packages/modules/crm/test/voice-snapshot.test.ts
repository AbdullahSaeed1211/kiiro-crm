import { expect, it } from 'vitest'
import { voiceSnapshot } from '../src/voice-calls'
import type { VoiceEngineDeps } from '../src/voice-core'
import type { VoiceCall, VoiceNumber } from '../src/voice-contracts'
import type { VoiceRepository } from '../src/ports/voice'

const call = (id: string, numberId: string, direction: VoiceCall['direction']) =>
  ({
    id,
    numberId,
    direction,
    userId: null,
    assignedUserIds: [],
    state: 'ringing',
    requestKey: id,
    from: '+12125550101',
    to: '+12125550102',
    leadId: null,
    createdAt: 1,
    answeredAt: null,
    endedAt: null,
    updatedAt: 1,
    lastEventAt: 1,
    providerCallId: null,
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
  }) as VoiceCall

it('shows unclaimed inbound calls on an assigned line while hiding other calls', async () => {
  const line = { id: 'assigned', status: 'active', inboundEnabled: true, assigneeIds: ['staff'] } as VoiceNumber
  const calls = [
    call('ring', 'assigned', 'inbound'),
    call('other', 'other', 'inbound'),
    call('out', 'assigned', 'outbound'),
  ]
  const repo = {
    loadSettings: () => Promise.resolve({}),
    listNumbers: () => Promise.resolve([line]),
    listCallsForUser: () => Promise.resolve(calls),
    getNumber: (id: string) => Promise.resolve(id === line.id ? line : undefined),
  } as unknown as VoiceRepository
  const result = await voiceSnapshot({
    actor: { id: 'staff', role: 'staff' },
    repo,
    configured: true,
    mode: 'simulator',
  } as VoiceEngineDeps)
  expect(result.ok).toBe(true)
  if (result.ok) expect(result.value.calls.map((entry) => entry.id)).toEqual(['ring'])
})
