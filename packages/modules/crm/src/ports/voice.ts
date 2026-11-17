import type { VoiceCall, VoiceDevice, VoiceEvent, VoiceNumber, VoiceOperation, VoiceSettings } from '../voice-contracts'

export interface VoiceCallLeg {
  readonly id: string
  readonly callId: string
  readonly deviceId: string | null
  readonly kind: 'inbound-caller' | 'inbound-device' | 'outbound-browser' | 'outbound-pstn'
  readonly providerCallId: string | null
  readonly state: 'dialing' | 'ringing' | 'answered' | 'bridged' | 'ended' | 'failed'
  readonly createdAt: number
  readonly updatedAt: number
}

/** Tenant scoped persistence boundary for the calling engine. All writes that claim a state are atomic. */
export interface VoiceRepository {
  loadSettings(): Promise<VoiceSettings>
  saveSettings(settings: VoiceSettings): Promise<void>
  listNumbers(): Promise<readonly VoiceNumber[]>
  getNumber(id: string): Promise<VoiceNumber | undefined>
  saveNumber(number: VoiceNumber): Promise<void>

  /** Resolves only active CRM leads readable by userId. */
  canReadLead(userId: string, leadId: string): Promise<boolean>
  isActiveUser(userId: string): Promise<boolean>
  listActiveMembers(): Promise<readonly { readonly id: string; readonly name: string }[]>

  listCallsForUser(userId: string, manageAll: boolean, limit: number): Promise<readonly VoiceCall[]>
  listOpenCalls(limit: number): Promise<readonly VoiceCall[]>
  getCall(id: string): Promise<VoiceCall | undefined>
  findCallByRequestKey(userId: string, requestKey: string): Promise<VoiceCall | undefined>
  findCallByProviderId(providerCallId: string): Promise<VoiceCall | undefined>
  /** Insert if absent by (userId, requestKey), returning the winner on a race. */
  reserveCall(call: VoiceCall, maxConcurrentCalls: number): Promise<VoiceCall | undefined>
  /** Compare-and-set call fields, returning undefined if the expected state/timestamp did not match. */
  updateCall(
    id: string,
    patch: Partial<VoiceCall>,
    expected?: { readonly states?: readonly VoiceCall['state'][]; readonly updatedAt?: number },
  ): Promise<VoiceCall | undefined>
  /** Atomically assigns an inbound call to the first answering active user. */
  claimInboundCall(
    id: string,
    userId: string,
    options: { readonly answeredAt: number; readonly maxConcurrentCalls: number },
  ): Promise<VoiceCall | undefined>
  reserveCallLeg(leg: VoiceCallLeg): Promise<VoiceCallLeg>
  getCallLeg(callId: string, deviceId: string | null, kind: VoiceCallLeg['kind']): Promise<VoiceCallLeg | undefined>
  findCallLegByProviderId(providerCallId: string): Promise<VoiceCallLeg | undefined>
  listCallLegs(callId: string): Promise<readonly VoiceCallLeg[]>
  updateCallLeg(
    id: string,
    patch: Partial<VoiceCallLeg>,
    expectedStates?: readonly VoiceCallLeg['state'][],
  ): Promise<VoiceCallLeg | undefined>

  getDevice(userId: string, deviceId: string): Promise<VoiceDevice | undefined>
  findDeviceByKey(key: string): Promise<VoiceDevice | undefined>
  saveDevice(device: VoiceDevice): Promise<void>
  listDevices(userIds: readonly string[]): Promise<readonly VoiceDevice[]>
  /** Insert one follow-up for a missed call with a readable lead; unique by the voice-call source key. */
  createMissedCallFollowUp(call: VoiceCall): Promise<void>

  getOperation(userId: string, key: string): Promise<VoiceOperation | undefined>
  /** Insert if absent by (userId, key), returning the winner on a race. */
  reserveOperation(operation: VoiceOperation): Promise<VoiceOperation>
  updateOperation(id: string, patch: Partial<VoiceOperation>): Promise<VoiceOperation | undefined>

  /** Unique eventKey insertion is the replay/deduplication boundary. */
  enqueueEvent(event: VoiceEvent): Promise<boolean>
  leaseEvents(now: number, leaseUntil: number, limit: number): Promise<readonly VoiceEvent[]>
  finishEvent(
    id: string,
    leaseUntil: number,
    result: { readonly status: 'pending' | 'processed' | 'failed'; readonly error?: string },
  ): Promise<void>
}
