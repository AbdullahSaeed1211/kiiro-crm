import type { ProvisionHttpClient, ProvisionState } from './plan'

/** Creates an HTTP client that keeps the internal secret in a header, never in argv or logs. */
export function fetchProvisionClient(request: typeof fetch = fetch): ProvisionHttpClient {
  return { post: postProvision(request), get: getProvision(request) }
}

function postProvision(request: typeof fetch): ProvisionHttpClient['post'] {
  return (url, body, secret) =>
    request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': secret },
      body: JSON.stringify(body),
    }).then((response) => ({ ok: response.ok, status: response.status }))
}

function getProvision(request: typeof fetch): ProvisionHttpClient['get'] {
  return async (url, secret) => {
    const response = await request(url, { headers: { 'x-internal-secret': secret } })
    return readProvisionResponse(response)
  }
}

async function readProvisionResponse(
  response: Response,
): Promise<{ ok: boolean; status: number; body?: Partial<ProvisionState> }> {
  try {
    return { ok: response.ok, status: response.status, body: (await response.json()) as Partial<ProvisionState> }
  } catch {
    return { ok: response.ok, status: response.status }
  }
}
