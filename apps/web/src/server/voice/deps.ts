import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createSystemVoiceRepository, createVoiceRepository } from '@ops/adapter-payload'
import { SimulatorVoiceProvider, TelnyxVoiceProvider } from '@ops/adapter-cloudflare'
import type { VoiceEngineDeps, VoiceProvider, VoiceProviderConfig, VoiceRepository } from '@ops/module-crm'
import { getPayload } from 'payload'
import type { ProductContext } from '@/server/auth/context'
import config from '@payload-config'

const configuredText = (value: string | undefined) => value !== undefined && value.trim().length > 0
const READINESS_TTL_MS = 60_000
const MAX_READINESS_ENTRIES = 32
const readinessCache = new Map<string, { readonly ready: boolean; readonly expiresAt: number }>()

interface QueueBinding {
  send(body: unknown, options?: { delaySeconds?: number }): Promise<void>
}

export interface VoiceProviderRuntime {
  readonly config: VoiceProviderConfig
  readonly provider: VoiceProvider | null
  readonly configured: boolean
  readonly production: boolean
  readonly queue: QueueBinding | undefined
  readonly repo?: VoiceRepository
  readonly webhookPublicKey: string
  readonly appId: string
  readonly connectionId: string
  readonly offerSigningSecret: string
}

export interface VoiceRuntime extends VoiceProviderRuntime {
  readonly repo: VoiceRepository
  readonly deps: VoiceEngineDeps
}

function envText(env: object, key: string): string {
  const value: unknown = Reflect.get(env, key)
  return typeof value === 'string' ? value : ''
}

function voiceMode(env: object, production: boolean): VoiceProviderConfig['mode'] {
  const mode = envText(env, 'VOICE_MODE')
  if (mode === 'telnyx') return mode
  return mode === 'simulator' && !production ? mode : 'disabled'
}

function providerConfig(env: object, production: boolean): VoiceProviderConfig {
  const mode = voiceMode(env, production)
  const local = mode === 'simulator'
  return {
    mode,
    apiKey: envText(env, 'TELNYX_API_KEY'),
    publicKey: envText(env, 'TELNYX_PUBLIC_KEY'),
    connectionId: envText(env, 'TELNYX_CONNECTION_ID') || (local ? 'sim-connection' : ''),
    callControlApplicationId: envText(env, 'TELNYX_CALL_CONTROL_APPLICATION_ID') || (local ? 'sim-app' : ''),
    webhookUrl: envText(env, 'TELNYX_WEBHOOK_URL') || `${envText(env, 'APP_ORIGIN')}/api/v1/voice/webhook`,
    offerSigningSecret: envText(env, 'VOICE_OFFER_SECRET') || envText(env, 'TENANT_SECRET'),
  }
}

async function resolveProvider(config: VoiceProviderConfig, queue: QueueBinding | undefined) {
  if (config.offerSigningSecret.length < 32) return { provider: null, configured: false }
  if (config.mode === 'simulator') return { provider: new SimulatorVoiceProvider(), configured: true }
  const required = [
    config.apiKey,
    config.publicKey,
    config.connectionId,
    config.callControlApplicationId,
    config.webhookUrl,
  ]
  if (config.mode !== 'telnyx' || queue === undefined || !required.every(configuredText)) {
    return { provider: null, configured: false }
  }
  const provider = new TelnyxVoiceProvider(config)
  return { provider, configured: await providerReady(provider, config) }
}

/** Resolves tenant configuration without exposing provider secrets to browser responses. */
async function voiceProviderRuntime(): Promise<VoiceProviderRuntime> {
  const { env } = await getCloudflareContext({ async: true })
  const production = process.env.NODE_ENV === 'production'
  const settings = providerConfig(env, production)
  const binding: unknown = Reflect.get(env, 'VOICE_EVENTS')
  const queue = isQueue(binding) ? binding : undefined
  const resolved = await resolveProvider(settings, queue)
  return {
    ...resolved,
    config: settings,
    production,
    queue,
    webhookPublicKey: settings.publicKey,
    appId: settings.callControlApplicationId,
    connectionId: settings.connectionId,
    offerSigningSecret: settings.offerSigningSecret,
  }
}

/** Authenticated request runtime; the request-bound repository enforces the caller's CRM scope. */
export async function voiceRuntime(context: ProductContext): Promise<VoiceRuntime> {
  const provider = await voiceProviderRuntime()
  const repo = createVoiceRepository(context.req)
  return {
    ...provider,
    repo,
    deps: {
      actor: context.actor,
      repo,
      provider: provider.configured ? provider.provider : null,
      mode: provider.configured ? provider.config.mode : 'disabled',
      configured: provider.configured,
      production: provider.production,
      offerSigningSecret: provider.offerSigningSecret,
      now: Date.now,
    },
  }
}

/** Internal queue and cron runtime without inventing an authenticated user. */
export async function systemVoiceRuntime(): Promise<VoiceProviderRuntime & { readonly repo: VoiceRepository }> {
  const provider = await voiceProviderRuntime()
  const payload = await getPayload({ config })
  return { ...provider, repo: await createSystemVoiceRepository(payload) }
}

async function providerReady(provider: VoiceProvider, config: VoiceProviderConfig): Promise<boolean> {
  if (!(provider instanceof TelnyxVoiceProvider)) return false
  const now = Date.now()
  const key = await readinessKey(config)
  const cached = readinessCache.get(key)
  if (cached !== undefined && cached.expiresAt > now) return cached.ready
  try {
    const ready = await provider.isConfiguredForParkedOutbound(config.webhookUrl, config.callControlApplicationId)
    rememberReadiness(key, ready, now)
    return ready
  } catch {
    rememberReadiness(key, false, now)
    return false
  }
}

async function readinessKey(config: VoiceProviderConfig): Promise<string> {
  const raw = `${config.apiKey}|${config.connectionId}|${config.callControlApplicationId}|${config.webhookUrl}`
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function rememberReadiness(key: string, ready: boolean, now: number): void {
  if (readinessCache.size >= MAX_READINESS_ENTRIES) {
    const oldest = readinessCache.keys().next().value
    if (oldest !== undefined) readinessCache.delete(oldest)
  }
  readinessCache.set(key, { ready, expiresAt: now + READINESS_TTL_MS })
}

function isQueue(value: unknown): value is QueueBinding {
  return value !== null && typeof value === 'object' && typeof Reflect.get(value, 'send') === 'function'
}
