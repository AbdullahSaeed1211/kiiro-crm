import type { VoiceProviderConfig } from '@ops/module-crm'
import { boundedText } from './telnyx-utils'

const API = 'https://api.telnyx.com/v2'
const REQUEST_TIMEOUT_MS = 10_000

/** Telnyx API response envelope. */
export interface TelnyxData<T> {
  readonly data?: T
  readonly errors?: readonly { readonly detail?: string }[]
}

/** Shared authenticated Telnyx API transport. */
export class TelnyxApi {
  constructor(protected readonly config: VoiceProviderConfig) {}

  /** Send bounded JSON requests to Telnyx. */
  protected async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${this.config.apiKey}`)
    headers.set('accept', 'application/json')
    if (init.body !== undefined) headers.set('content-type', 'application/json')
    const response = await fetch(`${API}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers,
    })
    const body = await boundedText(response, 64_000)
    if (!response.ok) throw new Error(`Telnyx API returned ${String(response.status)}`)
    if (body.length === 0) return {} as T
    try {
      return JSON.parse(body) as T
    } catch {
      throw new Error('Telnyx API returned an invalid response')
    }
  }

  /** Fetch a bounded plain-text Telnyx resource such as a client JWT. */
  protected async requestText(
    path: string,
    maxBytes: number,
  ): Promise<{ readonly response: Response; readonly body: string }> {
    const response = await fetch(`${API}${path}`, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { authorization: `Bearer ${this.config.apiKey}`, accept: 'text/plain' },
    })
    return { response, body: await boundedText(response, maxBytes) }
  }

  /** Stream a verified Telnyx recording without forwarding API credentials. */
  async downloadRecording(
    recordingId: string,
    providerCallId: string,
  ): Promise<{
    readonly body: ReadableStream<Uint8Array>
    readonly contentType: string
    readonly contentLength: number
  }> {
    return fetchRecording(await this.recordingDownloadUrl(recordingId, providerCallId))
  }

  private async recordingDownloadUrl(recordingId: string, providerCallId: string): Promise<string> {
    const metadata = await this.request<{
      readonly data?: {
        readonly call_control_id?: string
        readonly download_urls?: { readonly wav?: string; readonly mp3?: string }
      }
    }>(`/recordings/${encodeURIComponent(recordingId)}`)
    if (metadata.data?.call_control_id !== providerCallId)
      throw new Error('Telnyx recording belongs to a different call')
    const url = metadata.data.download_urls?.wav ?? metadata.data.download_urls?.mp3
    return trustedRecordingUrl(url)
  }
}

function trustedRecordingUrl(value: string | undefined): string {
  if (value === undefined) throw new Error('Telnyx recording is not available')
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.telnyx.com'))
    throw new Error('Telnyx returned an untrusted recording URL')
  return parsed.toString()
}

function limitStream(body: ReadableStream<Uint8Array>, maxBytes: number): ReadableStream<Uint8Array> {
  let total = 0
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        total += chunk.byteLength
        if (total > maxBytes) throw new Error('Telnyx recording exceeded the size limit')
        controller.enqueue(chunk)
      },
    }),
  )
}

async function fetchRecording(url: string): Promise<{
  readonly body: ReadableStream<Uint8Array>
  readonly contentType: string
  readonly contentLength: number
}> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' })
  if (!response.ok || response.body === null) throw new Error('Telnyx recording download failed')
  const contentLength = Number(response.headers.get('content-length'))
  if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > 100 * 1024 * 1024)
    throw new Error('Telnyx recording has an invalid content length')
  const contentType = response.headers.get('content-type') ?? 'audio/wav'
  return { body: limitStream(response.body, contentLength), contentType, contentLength }
}
