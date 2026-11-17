/** Shared wire and persistence contracts for tenant calling. Times are UTC Unix milliseconds. */
export type VoiceMode = 'disabled' | 'simulator' | 'telnyx'
export type VoiceCallState = 'authorizing' | 'ringing' | 'connecting' | 'active' | 'ended' | 'failed' | 'missed'
export type VoiceOutcome =
  'interested' | 'booking_arranged' | 'call_back_later' | 'no_answer' | 'voicemail' | 'not_interested' | 'wrong_number'
export interface VoiceSettings {
  enabled: boolean
  recordingEnabled: boolean
  maxCallSeconds: number
  maxConcurrentCalls: number
  ringSeconds: number
  fallback: 'voicemail' | 'forward'
  forwardingNumber: string | null
}
export interface VoiceNumber {
  id: string
  e164: string
  label: string
  assigneeIds: string[]
  status: 'pending' | 'active' | 'failed' | 'released'
  inboundEnabled: boolean
  outboundEnabled: boolean
  recordingEnabled: boolean
  providerNumberId: string | null
  providerOrderId: string | null
  monthlyCost: string | null
  setupCost: string | null
  updatedAt: number
}
export interface VoiceCall {
  id: string
  requestKey: string
  direction: 'inbound' | 'outbound'
  numberId: string
  from: string
  to: string
  userId: string | null
  assignedUserIds: string[]
  leadId: string | null
  state: VoiceCallState
  createdAt: number
  answeredAt: number | null
  endedAt: number | null
  updatedAt: number
  lastEventAt: number
  providerCallId: string | null
  providerBrowserCallId: string | null
  providerSessionId: string | null
  recordingId: string | null
  recordingFileId: string | null
  recordingState: 'off' | 'pending' | 'ready' | 'failed'
  outcome: VoiceOutcome | null
  notes: string | null
  nextActionAt: number | null
  appointmentAt: number | null
  error: string | null
}
export interface VoiceDevice {
  id: string
  key: string
  userId: string
  deviceId: string
  providerCredentialId: string
  sipUsername: string
  expiresAt: number
  lastSeenAt: number
}
export interface VoiceEvent {
  id: string
  eventKey: string
  kind: string
  occurredAt: number
  receivedAt: number
  payload: Record<string, unknown>
  status: 'pending' | 'processing' | 'processed' | 'failed'
  attempts: number
  leaseUntil: number | null
  error: string | null
}
export interface VoiceOperation {
  id: string
  key: string
  kind: 'purchase' | 'release'
  userId: string
  numberId: string | null
  e164: string
  status: 'pending' | 'complete' | 'failed' | 'uncertain'
  providerOrderId: string | null
  createdAt: number
  updatedAt: number
}
export interface VoiceOffer {
  token: string
  e164: string
  region: string
  monthlyCost: string
  setupCost: string
  expiresAt: number
}
export interface VoiceSnapshot {
  configured: boolean
  mode: VoiceMode
  canManage: boolean
  userId: string
  settings: VoiceSettings
  numbers: VoiceNumber[]
  calls: VoiceCall[]
  devices?: VoiceDevice[]
  members: { id: string; name: string }[]
}
export interface VoiceClientSession {
  mode: 'simulator' | 'telnyx'
  deviceId: string
  token: string
  sipUsername: string
  expiresAt: number
}
export interface VoiceDialResult {
  call: VoiceCall
  session: VoiceClientSession
  browserDestination: string
  clientState: string
}
export interface VoiceProviderConfig {
  mode: VoiceMode
  apiKey: string
  publicKey: string
  connectionId: string
  callControlApplicationId: string
  webhookUrl: string
  offerSigningSecret: string
}
