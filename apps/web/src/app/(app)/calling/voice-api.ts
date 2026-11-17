'use client'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Reads one authenticated same-origin API response without exposing malformed payloads to UI state. */
async function responseData<T>(response: Response): Promise<T> {
  const parsed: unknown = await response.json()
  if (!isRecord(parsed)) throw new Error('The calling service returned an invalid response.')
  const body = parsed
  if (!response.ok || body.ok === false || body.data === undefined) {
    const error = isRecord(body.error) ? body.error : undefined
    const message = error?.message
    throw new Error(typeof message === 'string' ? message : 'The calling request could not be completed.')
  }
  return body.data as T
}

export async function voiceApi<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('content-type', 'application/json')
  const response = await fetch(`/api/v1/voice${path}`, { ...init, credentials: 'same-origin', headers })
  return responseData<T>(response)
}
