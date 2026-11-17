import type { VoiceClientSession, VoiceDevice, VoiceOffer } from '@ops/module-crm'
import type { VoiceProvider } from '@ops/module-crm'

/** Local-only simulator. It never buys, releases, or places a PSTN call. */
export class SimulatorVoiceProvider implements VoiceProvider {
  readonly mode = 'simulator' as const

  createDeviceCredential(input: { readonly userId: string; readonly deviceId: string }): Promise<VoiceDevice> {
    return Promise.resolve({
      id: crypto.randomUUID(),
      key: crypto.randomUUID(),
      userId: input.userId,
      deviceId: input.deviceId,
      providerCredentialId: `sim-${crypto.randomUUID()}`,
      sipUsername: `sim-${input.userId.slice(0, 20)}`,
      expiresAt: Date.now() + 24 * 60 * 60_000,
      lastSeenAt: Date.now(),
    })
  }

  issueSession(input: { readonly device: VoiceDevice }): Promise<VoiceClientSession> {
    return Promise.resolve({
      mode: 'simulator',
      deviceId: input.device.deviceId,
      token: `sim.${crypto.randomUUID()}`,
      sipUsername: input.device.sipUsername,
      expiresAt: Date.now() + 15 * 60_000,
    })
  }

  revokeDeviceCredential(): Promise<void> {
    return Promise.resolve()
  }

  searchNumbers(): Promise<readonly VoiceOffer[]> {
    return Promise.reject(new Error('Phone number search requires Telnyx mode.'))
  }

  verifyNumber(): Promise<'active' | 'pending' | 'failed'> {
    return Promise.reject(new Error('Phone number reconciliation requires Telnyx mode.'))
  }

  downloadRecording(): Promise<{
    readonly body: ReadableStream<Uint8Array>
    readonly contentType: string
    readonly contentLength: number
  }> {
    return Promise.reject(new Error('Recording downloads require Telnyx mode.'))
  }

  purchaseNumber(): Promise<never> {
    return Promise.reject(new Error('Phone number purchase requires Telnyx mode.'))
  }

  releaseNumber(): Promise<void> {
    return Promise.reject(new Error('Phone number release requires Telnyx mode.'))
  }

  command(): Promise<void> {
    return Promise.resolve()
  }

  dialPstn(): Promise<string> {
    return Promise.resolve(`sim-pstn-${crypto.randomUUID()}`)
  }

  dialInboundDevice(): Promise<string> {
    return Promise.resolve(`sim-inbound-${crypto.randomUUID()}`)
  }

  bridge(): Promise<void> {
    return Promise.resolve()
  }

  fallbackInbound(): Promise<void> {
    return Promise.resolve()
  }
}
