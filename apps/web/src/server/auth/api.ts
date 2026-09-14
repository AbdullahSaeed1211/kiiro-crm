import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { generatePayloadCookie, getPayload, type Payload } from 'payload'
import { bodyOf, unsupportedContentType } from './request'

export { errorResponse, passwordPolicyResponse } from './request'

const AUTH_COLLECTION = 'users'

export interface UntypedPayloadDocument extends Record<string, unknown> {
  readonly id: string | number
}
export interface UntypedPayload {
  find(options: Record<string, unknown>): Promise<{ docs: (UntypedPayloadDocument | undefined)[] }>
  create(options: Record<string, unknown>): Promise<UntypedPayloadDocument>
  update(options: Record<string, unknown>): Promise<UntypedPayloadDocument | { docs: UntypedPayloadDocument[] }>
  delete(options: Record<string, unknown>): Promise<UntypedPayloadDocument>
}

export function payloadData(payload: Payload): UntypedPayload {
  return payload as unknown as UntypedPayload
}

/** Auth routes fail closed when the tenant rate-limit binding is absent or unavailable. */
async function enforceAuthRateLimit(request: Request): Promise<Response | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true })
    const address = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown'
    const result = await env.RATE_LIMIT_AUTH.limit({ key: `auth:${address.split(',')[0].trim()}` })
    return result.success
      ? undefined
      : Response.json(
          { error: 'Too many authentication attempts. Try again later.' },
          { status: 429, headers: { 'retry-after': '60' } },
        )
  } catch {
    return Response.json({ error: 'Authentication service is temporarily unavailable.' }, { status: 503 })
  }
}

export async function authBody(request: Request): Promise<Record<string, unknown> | Response> {
  const contentTypeError = unsupportedContentType(request)
  if (contentTypeError !== undefined) return contentTypeError
  const rateLimitError = await enforceAuthRateLimit(request)
  if (rateLimitError !== undefined) return rateLimitError
  const body = await bodyOf(request)
  return body ?? Response.json({ error: 'A valid JSON request body is required.' }, { status: 400 })
}

export async function payloadForAuth(): Promise<Payload> {
  return getPayload({ config })
}

export function stringOf(body: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = body?.[key]
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function authCookie(payload: Payload, token: string): string {
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
