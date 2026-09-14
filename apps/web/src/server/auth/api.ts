import config from '@payload-config'
import { generatePayloadCookie, getPayload, type Payload } from 'payload'

export const AUTH_COLLECTION = 'users'

export interface UntypedPayloadDocument extends Record<string, unknown> {
  readonly id: string | number
}
export interface UntypedPayload {
  find(options: Record<string, unknown>): Promise<{ docs: (UntypedPayloadDocument | undefined)[] }>
  create(options: Record<string, unknown>): Promise<UntypedPayloadDocument>
  update(options: Record<string, unknown>): Promise<UntypedPayloadDocument>
}

export function payloadData(payload: Payload): UntypedPayload {
  return payload as unknown as UntypedPayload
}

export function errorResponse(error: unknown, fallback = 'Unable to complete the request.'): Response {
  const status =
    typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
      ? error.status
      : 400
  const message = error instanceof Error ? error.message : fallback
  return Response.json({ error: message }, { status })
}

export async function payloadForAuth(): Promise<Payload> {
  return getPayload({ config })
}

export async function bodyOf(request: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const value: unknown = await request.json()
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    return value as Record<string, unknown>
  } catch {
    return undefined
  }
}

export function stringOf(body: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = body?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export function authCookie(payload: Payload, token: string): string {
  const collection = Object.values(payload.config.collections).find((candidate) => candidate.slug === AUTH_COLLECTION)
  if (collection?.auth === undefined) throw new Error('Auth collection is not configured.')
  return generatePayloadCookie({
    collectionAuthConfig: collection.auth,
    cookiePrefix: payload.config.cookiePrefix,
    token,
  })
}

export function jsonWithCookie(payload: Payload, token: string, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': authCookie(payload, token) },
  })
}
