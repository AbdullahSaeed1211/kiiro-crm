import type { VoiceCall, VoiceClientSession, VoiceDevice, VoiceOffer } from '../voice-contracts'

/** Provider boundary. Browser credentials and PSTN control are intentionally separate operations. */
export interface VoiceProvider {
  readonly mode: 'simulator' | 'telnyx'
  createDeviceCredential(input: { readonly userId: string; readonly deviceId: string }): Promise<VoiceDevice>
  revokeDeviceCredential(device: VoiceDevice): Promise<void>
  issueSession(input: { readonly device: VoiceDevice }): Promise<VoiceClientSession>
  searchNumbers(input: { readonly areaCode: string }): Promise<readonly VoiceOffer[]>
  purchaseNumber(input: { readonly offer: VoiceOffer; readonly requestKey: string }): Promise<{
    readonly status: 'active' | 'pending'
    readonly e164: string
    readonly providerNumberId: string
    readonly orderId: string
    readonly monthlyCost: string
    readonly setupCost: string
  }>
  verifyNumber(input: {
    readonly providerNumberId: string
    readonly orderId: string
  }): Promise<'active' | 'pending' | 'failed'>
  downloadRecording(
    recordingId: string,
    providerCallId: string,
  ): Promise<{
    readonly body: ReadableStream<Uint8Array>
    readonly contentType: string
    readonly contentLength: number
  }>
  releaseNumber(input: { readonly providerNumberId: string; readonly requestKey: string }): Promise<void>
  command(input: {
    readonly action: 'answer' | 'decline' | 'hangup'
    readonly call: VoiceCall
    readonly userId: string
    readonly providerCallId?: string
  }): Promise<void>
  dialPstn(input: {
    readonly call: VoiceCall
    readonly browserCallId: string
    readonly clientState: string
    readonly timeLimitSeconds: number
  }): Promise<string>
  dialInboundDevice(input: {
    readonly call: VoiceCall
    readonly device: VoiceDevice
    readonly clientState: string
    readonly timeoutSeconds: number
  }): Promise<string>
  bridge(input: {
    readonly firstCallId: string
    readonly secondCallId: string
    readonly commandKey: string
  }): Promise<void>
  fallbackInbound(input: { readonly call: VoiceCall; readonly forwardingNumber: string | null }): Promise<void>
}
