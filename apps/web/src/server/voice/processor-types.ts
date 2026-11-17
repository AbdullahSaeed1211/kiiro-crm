import type { VoiceCall, VoiceProvider, VoiceRepository } from '@ops/module-crm'

export interface VoiceEventProcessorDeps {
  readonly repo: VoiceRepository
  readonly provider: VoiceProvider
  readonly offerSigningSecret: string
  readonly connectionId: string
  readonly applicationId: string
  readonly now: () => number
  readonly enqueueReconcile: (callId: string, delaySeconds: number) => Promise<void>
  readonly persistRecording?: (call: VoiceCall, recordingId: string, providerCallId: string) => Promise<void>
}

export interface VoiceEventProcessorResult {
  readonly leased: number
  readonly processed: number
  readonly failed: number
}

export interface VoiceNumberProcessorDeps {
  readonly repo: VoiceRepository
  readonly provider: VoiceProvider
}

export const ACTIVE_VOICE_STATES = ['authorizing', 'ringing', 'connecting', 'active'] as const
