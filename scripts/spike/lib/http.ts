import { performance } from 'node:perf_hooks'
import { REDACTED, redact, roundMs } from './output'
import { runCommand, type CommandSpec } from './process'

/** An HTTP request to time or print. */
export interface RequestSpec {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
  readonly body?: string | undefined
}

/** Duration in milliseconds and HTTP status of one request. */
export interface Timing {
  readonly ms: number
  readonly status: number
}

/** Request timer: curl's `time_total` in a new process, or `fetch` timed with `performance.now()`. */
export type Client = 'curl' | 'fetch'

/** Description of each client, recorded in output metadata. */
export const CLIENT_TIMERS: Readonly<Record<Client, string>> = {
  curl: "curl -w '%{http_code} %{time_total}': one process and connection per request, body discarded",
  fetch: 'fetch timed with performance.now(): from send to fully read body, connections kept alive',
}

const CREDENTIAL_HEADERS = new Set(['authorization', 'cookie', 'proxy-authorization'])

/** True for 2xx and 3xx statuses. */
export function isAcceptedStatus(status: number): boolean {
  return status >= 200 && status < 400
}

function maskValue(value: string): string {
  const scheme = /^(Bearer|Basic)\s/i.exec(value)?.[1]
  return scheme === undefined ? REDACTED : `${scheme} ${REDACTED}`
}

/** Copy of `request` with credential header values masked, keeping an auth scheme such as `Bearer`. */
export function redactHeaders(request: RequestSpec): RequestSpec {
  const entries = Object.entries(request.headers).map(([name, value]) => {
    return [name, CREDENTIAL_HEADERS.has(name.toLowerCase()) ? maskValue(value) : value] as const
  })
  return { ...request, headers: Object.fromEntries(entries) }
}

/** Renders a request for dry-run output with credential headers and every `secrets` value redacted. */
export function formatRequest(request: RequestSpec, secrets: readonly string[]): string {
  const safe = redactHeaders(request)
  const headers = Object.entries(safe.headers).map(([name, value]) => `  ${name}: ${value}`)
  const body = safe.body === undefined ? [] : [`  body: ${safe.body}`]
  return redact([`${safe.method} ${safe.url}`, ...headers, ...body].join('\n'), secrets)
}

/** curl arguments that discard the body and print `<status> <time_total seconds>`; redirects are not followed. */
export function curlCommand(request: RequestSpec): CommandSpec {
  const headers = Object.entries(request.headers).flatMap(([name, value]) => ['-H', `${name}: ${value}`])
  const body = request.body === undefined ? [] : ['--data-binary', request.body]
  const format = ['-w', '%{http_code} %{time_total}']
  return {
    file: 'curl',
    args: ['-sS', '-o', '/dev/null', ...format, '-X', request.method, ...headers, ...body, request.url],
  }
}

/** Parses curl's `<status> <seconds>` write-out into milliseconds; null when it does not match. */
export function parseCurlTiming(output: string): Timing | null {
  const match = /^(\d{3}) (\d+(?:\.\d+)?)$/.exec(output.trim())
  if (match?.[1] === undefined || match[2] === undefined) return null
  return { status: Number(match[1]), ms: roundMs(Number(match[2]) * 1000) }
}

function timeCurl(request: RequestSpec): Timing {
  const result = runCommand(curlCommand(request))
  const timing = result.code === 0 ? parseCurlTiming(result.output) : null
  if (timing === null) {
    throw new Error(
      `curl ${request.method} ${request.url} failed (exit ${String(result.code)}): ${result.output.trim()}`,
    )
  }
  return timing
}

/** Times one request with `fetch` and `performance.now()`, reading the whole body; redirects are not followed. */
export async function timeFetch(request: RequestSpec): Promise<Timing> {
  const body = request.body === undefined ? {} : { body: request.body }
  const started = performance.now()
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
    ...body,
  })
  await response.arrayBuffer()
  return { status: response.status, ms: roundMs(performance.now() - started) }
}

/** Times one request with `client`; throws unless the status is 2xx or 3xx. */
export async function timeAccepted(request: RequestSpec, client: Client): Promise<Timing> {
  const timing = client === 'curl' ? timeCurl(request) : await timeFetch(request)
  if (!isAcceptedStatus(timing.status)) {
    throw new Error(`${request.method} ${request.url} returned ${String(timing.status)}, expected 2xx or 3xx`)
  }
  return timing
}
