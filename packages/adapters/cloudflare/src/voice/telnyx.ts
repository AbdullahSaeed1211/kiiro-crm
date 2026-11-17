import type { VoiceCall, VoiceClientSession, VoiceDevice } from '@ops/module-crm'
import type { VoiceProvider } from '@ops/module-crm'
import { deterministicCommandId, jwtExpiry } from './telnyx-utils'
import { TelnyxNumberProvider } from './telnyx-numbers'
import type { TelnyxData } from './telnyx-api'

const TOKEN_REFRESH_MS = 2 * 60_000

interface CredentialResponse {
  readonly id?: string
  readonly sip_username?: string
  readonly expires_at?: string
}

interface TelnyxCallCommand {
  readonly call_control_id?: string
}

/** Telnyx browser calling, call-control, and fallback provider. */
export class TelnyxVoiceProvider extends TelnyxNumberProvider implements VoiceProvider {
  readonly mode = 'telnyx' as const

  async isConfiguredForParkedOutbound(webhookUrl: string, applicationId: string): Promise<boolean> {
    const [application, connection] = await Promise.all([
      this.request<
        TelnyxData<{ readonly id?: string; readonly webhook_event_url?: string; readonly active?: boolean }>
      >(`/call_control_applications/${encodeURIComponent(applicationId)}`),
      this.request<
        TelnyxData<{
          readonly id?: string
          readonly active?: boolean
          readonly webhook_event_url?: string
          readonly outbound?: { readonly call_parking_enabled?: boolean }
        }>
      >(`/credential_connections/${encodeURIComponent(this.config.connectionId)}`),
    ])
    return isParkedCallReady({
      application: application.data,
      connection: connection.data,
      applicationId,
      connectionId: this.config.connectionId,
      webhookUrl,
    })
  }

  async createDeviceCredential(input: { readonly userId: string; readonly deviceId: string }): Promise<VoiceDevice> {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString()
    const payload = await this.request<TelnyxData<CredentialResponse>>('/telephony_credentials', {
      method: 'POST',
      body: JSON.stringify({
        connection_id: this.config.connectionId,
        expires_at: expiresAt,
        name: `crm-${input.userId.slice(0, 20)}-${input.deviceId.slice(0, 20)}`,
        tag: `ops-device-${input.userId}-${input.deviceId}`.slice(0, 120),
      }),
    })
    const credential = payload.data
    if (!credential?.id || !credential.sip_username || !credential.expires_at)
      throw new Error('Telnyx omitted telephony credential fields')
    const expiry = Date.parse(credential.expires_at)
    if (!Number.isFinite(expiry) || expiry <= Date.now())
      throw new Error('Telnyx returned an expired telephony credential')
    return {
      id: crypto.randomUUID(),
      key: crypto.randomUUID(),
      userId: input.userId,
      deviceId: input.deviceId,
      providerCredentialId: credential.id,
      sipUsername: credential.sip_username,
      expiresAt: expiry,
      lastSeenAt: Date.now(),
    }
  }

  async issueSession(input: { readonly device: VoiceDevice }): Promise<VoiceClientSession> {
    const { response, body } = await this.requestText(
      `/telephony_credentials/${encodeURIComponent(input.device.providerCredentialId)}/token`,
      16_000,
    )
    const token = body.trim()
    if (!response.ok || !token) throw new Error(`Telnyx token request returned ${String(response.status)}`)
    const expiresAt = jwtExpiry(token)
    if (expiresAt === undefined || expiresAt > input.device.expiresAt || expiresAt <= Date.now() + TOKEN_REFRESH_MS) {
      throw new Error('Telnyx returned a token with invalid expiry')
    }
    return {
      mode: 'telnyx',
      deviceId: input.device.deviceId,
      token,
      sipUsername: input.device.sipUsername,
      expiresAt,
    }
  }

  async revokeDeviceCredential(device: VoiceDevice): Promise<void> {
    await this.request(`/telephony_credentials/${encodeURIComponent(device.providerCredentialId)}`, {
      method: 'DELETE',
    })
  }

  async command(input: {
    readonly action: 'answer' | 'decline' | 'hangup'
    readonly call: VoiceCall
    readonly userId: string
    readonly providerCallId?: string
  }): Promise<void> {
    const providerCallId = input.providerCallId ?? input.call.providerCallId
    if (!providerCallId) throw new Error('The provider call is not linked yet')
    const action = input.action === 'decline' ? 'reject' : input.action
    await this.request(`/calls/${encodeURIComponent(providerCallId)}/actions/${action}`, {
      method: 'POST',
      body: JSON.stringify({ command_id: deterministicCommandId(input.call.id, input.action) }),
    })
  }

  async dialPstn(input: {
    readonly call: VoiceCall
    readonly browserCallId: string
    readonly clientState: string
    readonly timeLimitSeconds: number
  }): Promise<string> {
    const response = await this.request<TelnyxData<TelnyxCallCommand>>('/calls', {
      method: 'POST',
      body: JSON.stringify({
        command_id: `${input.call.id}-pstn-dial`.slice(0, 64),
        connection_id: this.config.callControlApplicationId,
        from: input.call.from,
        to: input.call.to,
        webhook_url: this.config.webhookUrl,
        webhook_url_method: 'POST',
        client_state: input.clientState,
        link_to: input.browserCallId,
        time_limit_secs: input.timeLimitSeconds,
        ...(input.call.recordingState === 'pending' ? { record: 'record-from-answer', record_channels: 'dual' } : {}),
      }),
    })
    if (!response.data?.call_control_id) throw new Error('Telnyx did not return the outbound call identifier')
    return response.data.call_control_id
  }

  async dialInboundDevice(input: {
    readonly call: VoiceCall
    readonly device: VoiceDevice
    readonly clientState: string
    readonly timeoutSeconds: number
  }): Promise<string> {
    const response = await this.request<TelnyxData<TelnyxCallCommand>>('/calls', {
      method: 'POST',
      body: JSON.stringify({
        command_id: `${input.call.id}-${input.device.id}-inbound`.slice(0, 64),
        connection_id: this.config.callControlApplicationId,
        from: input.call.from,
        to: `sip:${input.device.sipUsername}@sip.telnyx.com`,
        webhook_url: this.config.webhookUrl,
        webhook_url_method: 'POST',
        client_state: input.clientState,
        timeout_secs: input.timeoutSeconds,
        time_limit_secs: 14_400,
      }),
    })
    if (!response.data?.call_control_id) throw new Error('Telnyx did not return the inbound device leg identifier')
    return response.data.call_control_id
  }

  async bridge(input: {
    readonly firstCallId: string
    readonly secondCallId: string
    readonly commandKey: string
  }): Promise<void> {
    await this.request(`/calls/${encodeURIComponent(input.firstCallId)}/actions/bridge`, {
      method: 'POST',
      body: JSON.stringify({ call_control_id: input.secondCallId, command_id: input.commandKey }),
    })
  }

  async fallbackInbound(input: { readonly call: VoiceCall; readonly forwardingNumber: string | null }): Promise<void> {
    const callControlId = input.call.providerCallId
    if (!callControlId) throw new Error('The inbound provider call is not linked yet')
    if (input.forwardingNumber !== null) {
      await this.request(`/calls/${encodeURIComponent(callControlId)}/actions/transfer`, {
        method: 'POST',
        body: JSON.stringify({ to: input.forwardingNumber, command_id: `${input.call.id}-fallback-forward` }),
      })
      return
    }
    await this.command({ action: 'answer', call: input.call, userId: 'system', providerCallId: callControlId })
    await this.request(`/calls/${encodeURIComponent(callControlId)}/actions/speak`, {
      method: 'POST',
      body: JSON.stringify({
        payload: 'Please leave a message after the tone.',
        voice: 'female',
        language: 'en-US',
        command_id: `${input.call.id}-voicemail-greeting`,
      }),
    })
    await this.request(`/calls/${encodeURIComponent(callControlId)}/actions/record_start`, {
      method: 'POST',
      body: JSON.stringify({
        format: 'wav',
        channels: 'dual',
        play_beep: true,
        max_length: 60,
        command_id: `${input.call.id}-voicemail-record`,
      }),
    })
  }
}

function isParkedCallReady(input: {
  readonly application:
    { readonly id?: string; readonly active?: boolean; readonly webhook_event_url?: string } | undefined
  readonly connection:
    | {
        readonly id?: string
        readonly active?: boolean
        readonly webhook_event_url?: string
        readonly outbound?: { readonly call_parking_enabled?: boolean }
      }
    | undefined
  readonly applicationId: string
  readonly connectionId: string
  readonly webhookUrl: string
}): boolean {
  return isApplicationReady(input) && isConnectionReady(input)
}

function isApplicationReady(input: Parameters<typeof isParkedCallReady>[0]): boolean {
  const application = input.application
  return (
    application?.id === input.applicationId &&
    application.active === true &&
    application.webhook_event_url === input.webhookUrl
  )
}

function isConnectionReady(input: Parameters<typeof isParkedCallReady>[0]): boolean {
  const connection = input.connection
  return (
    connection?.id === input.connectionId &&
    connection.active === true &&
    connection.webhook_event_url === input.webhookUrl &&
    connection.outbound?.call_parking_enabled === true
  )
}

export { verifyTelnyxWebhook } from './telnyx-webhook'
export type { VerifiedTelnyxEvent } from './telnyx-webhook'
