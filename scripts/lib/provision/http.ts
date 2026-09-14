import type { ProvisionHttpClient } from './plan'

/** Creates an HTTP client that keeps the internal secret in a header, never in argv or logs. */
export function fetchProvisionClient(request: typeof fetch = fetch, timeoutMs = 15_000): ProvisionHttpClient {
  return { post: postProvision(request, timeoutMs), get: getProvision(request, timeoutMs) }
}

function postProvision(request: typeof fetch, timeoutMs: number): ProvisionHttpClient['post'] {
  return (url, body, secret) =>
    requestWithTimeout({
      request,
      url,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
        body: JSON.stringify(body),
      },
      timeoutMs,
    }).then((response) => ({ ok: response.ok, status: response.status }))
}

function getProvision(request: typeof fetch, timeoutMs: number): ProvisionHttpClient['get'] {
  return async (url, secret) => {
    const response = await requestWithTimeout({
      request,
      url,
      init: { headers: { 'x-internal-secret': secret } },
      timeoutMs,
    })
    return readProvisionResponse(response)
  }
}

async function requestWithTimeout(input: {
  readonly request: typeof fetch
  readonly url: string
  readonly init: RequestInit
  readonly timeoutMs: number
}): Promise<Response> {
  const { request, url, init, timeoutMs } = input
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(`provision request timed out after ${String(timeoutMs)}ms`))
    }, timeoutMs)
  })
  try {
    return await Promise.race([request(url, { ...init, signal: controller.signal }), timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

async function readProvisionResponse(response: Response): Promise<{ ok: boolean; status: number; body?: unknown }> {
  try {
    return { ok: response.ok, status: response.status, body: await response.json() }
  } catch {
    return { ok: response.ok, status: response.status }
  }
}
