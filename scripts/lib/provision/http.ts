import type { ProvisionHttpClient } from './types'
import { requestWithTimeout } from '../http'

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

async function readProvisionResponse(response: Response): Promise<{ ok: boolean; status: number; body?: unknown }> {
  try {
    return { ok: response.ok, status: response.status, body: await response.json() }
  } catch {
    return { ok: response.ok, status: response.status }
  }
}
