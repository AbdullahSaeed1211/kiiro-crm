/* eslint-disable complexity -- verification deliberately fails closed across every provider boundary. */
import { createJsonLogger, type Logger } from '@ops/kernel'

/** Cloudflare Turnstile verification endpoint. */
export const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** A narrow Turnstile response accepted by the server. */
export interface TurnstileResponse {
  readonly success?: boolean
  readonly hostname?: string
  readonly action?: string
}

/** Inputs for the fail-closed Turnstile verifier. */
export interface TurnstileVerifierOptions {
  readonly secret: string | undefined
  readonly fetcher?: typeof fetch
  readonly logger?: Logger
  readonly timeoutMs?: number
}

/** Verifies a single-use Turnstile token and requires an allowlisted hostname. */
export async function verifyTurnstile(
  input: {
    readonly token: string
    readonly remoteIp?: string
    readonly allowedHostnames: readonly string[]
    readonly action?: string
  },
  options: TurnstileVerifierOptions,
): Promise<boolean> {
  const secret = options.secret
  if (secret === undefined || !validInput(input, secret)) return false
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, options.timeoutMs ?? 10_000)
  try {
    const body = new URLSearchParams({ secret, response: input.token })
    if (input.remoteIp !== undefined) body.set('remoteip', input.remoteIp)
    body.set('action', input.action ?? 'intake')
    return await requestVerification({
      options,
      body,
      signal: controller.signal,
      hostnames: input.allowedHostnames,
      action: input.action ?? 'intake',
    })
  } catch (error) {
    const logger = options.logger ?? createJsonLogger()
    logger.warn('turnstile.verify_failed', { reason: error instanceof Error ? error.name : 'unknown' })
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function requestVerification(input: {
  readonly options: TurnstileVerifierOptions
  readonly body: URLSearchParams
  readonly signal: AbortSignal
  readonly hostnames: readonly string[]
  readonly action: string
}): Promise<boolean> {
  const response = await (input.options.fetcher ?? fetch)(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: input.body,
    signal: input.signal,
  })
  return response.ok && isAccepted(await response.json(), input.hostnames, input.action)
}

function validInput(
  input: { readonly token: string; readonly allowedHostnames: readonly string[] },
  secret: string | undefined,
): boolean {
  return (
    secret !== undefined &&
    secret !== '' &&
    input.token !== '' &&
    input.token.length <= 2048 &&
    input.allowedHostnames.length > 0
  )
}

function isAccepted(result: unknown, hostnames: readonly string[], action: string): boolean {
  if (
    typeof result !== 'object' ||
    result === null ||
    !('success' in result) ||
    !('hostname' in result) ||
    !('action' in result)
  )
    return false
  const data = result as TurnstileResponse
  return (
    data.success === true &&
    typeof data.hostname === 'string' &&
    hostnames.includes(data.hostname) &&
    data.action === action
  )
}
