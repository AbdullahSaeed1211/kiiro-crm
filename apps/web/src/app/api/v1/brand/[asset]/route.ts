import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload, type PayloadRequest } from 'payload'
import { revalidatePath } from 'next/cache'
import { authenticate } from '../../../../../server/collaboration/auth'
import { badRequest, forbidden, unauthorized } from '../../../../../server/collaboration/responses'
import { isBrandContentType, isBrandKey } from '../../../../../server/collaboration/brand'

export const dynamic = 'force-dynamic'
const MAX_BRAND_BYTES = 1024 * 1024

interface Params {
  readonly params: Promise<{ asset: string }>
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function fallback(letter: string, color: string): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${color}"/><text x="32" y="43" fill="white" font-family="sans-serif" font-size="32" text-anchor="middle">${escapeXml(letter)}</text></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' } })
}

function assetKey(asset: string, settings: Record<string, unknown>): string | undefined {
  const keyName = asset === 'logo' ? 'logoFileKey' : 'faviconFileKey'
  const key = settings[keyName]
  return typeof key === 'string' && key.trim() !== '' && isBrandKey(key) ? key : undefined
}

function isBrandAsset(asset: string): asset is 'logo' | 'favicon' {
  return asset === 'logo' || asset === 'favicon'
}

function fallbackFor(settings: Record<string, unknown>): Response {
  const value = settings.appName
  const appName = typeof value === 'string' && value !== '' ? value : 'Workspace'
  const brand =
    typeof settings.brand === 'object' && settings.brand !== null ? (settings.brand as Record<string, unknown>) : {}
  const color =
    typeof brand.primaryHex === 'string' && /^#[\da-f]{6}$/i.test(brand.primaryHex) ? brand.primaryHex : '#64748b'
  return fallback(appName.trim().charAt(0).toUpperCase() || 'W', color)
}

async function streamBrandAsset(key: string): Promise<Response> {
  if (!isBrandKey(key)) return new Response('Not found', { status: 404 })
  const { env } = await getCloudflareContext({ async: true })
  const object = await env.R2.get(key)
  if (object === null) return new Response('Not found', { status: 404 })
  if (!isBrandContentType(object.httpMetadata?.contentType)) return new Response('Not found', { status: 404 })
  const headers = new Headers({ 'Cache-Control': 'public, max-age=300' })
  if (object.httpMetadata?.contentType) headers.set('Content-Type', object.httpMetadata.contentType)
  return new Response(object.body, { headers })
}

/** Serves explicitly configured public brand assets; the favicon has a safe letter-tile fallback. */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const { asset } = await params
  if (!isBrandAsset(asset)) return new Response('Not found', { status: 404 })
  const payload = await getPayload({ config })
  const settings = (await payload.findGlobal({ slug: 'settings', depth: 0 })) as unknown as Record<string, unknown>
  const key = assetKey(asset, settings)
  if (key === undefined) return fallbackFor(settings)
  return streamBrandAsset(key)
}

function requestForUser(
  payload: Awaited<ReturnType<typeof getPayload>>,
  user: Record<string, unknown>,
): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}

function extensionFor(file: File): string {
  if (file.type === 'image/svg+xml') return 'svg'
  if (file.type === 'image/x-icon') return 'ico'
  const ext = file.type.split('/')[1]
  return ext === 'jpeg' ? 'jpg' : ext
}

/** Owner-only upload for the tenant's public brand assets. */
// eslint-disable-next-line complexity, max-statements -- upload is one authorization and idempotent R2/DB transaction boundary.
export async function POST(request: Request, { params }: Params): Promise<Response> {
  const { asset } = await params
  if (!isBrandAsset(asset)) return new Response('Not found', { status: 404 })
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  if (context.role !== 'owner') return forbidden()
  const file = (await request.formData()).get('file')
  if (!(file instanceof File)) return badRequest('A file is required.')
  if (file.size === 0 || file.size > MAX_BRAND_BYTES) return badRequest('Brand assets must be 1 MB or smaller.')
  if (!isBrandContentType(file.type)) return badRequest('Use PNG, JPEG, SVG, WebP, GIF, or ICO.')
  const key = `brand/${asset}.${extensionFor(file)}`
  const req = requestForUser(payload, context.user)
  const { env } = await getCloudflareContext({ async: true })
  const settings = (await payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: false,
    req,
  })) as unknown as Record<string, unknown>
  const oldKey = assetKey(asset, settings)
  await env.R2.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  try {
    const field = asset === 'logo' ? 'logoFileKey' : 'faviconFileKey'
    await payload.updateGlobal({ slug: 'settings', data: { [field]: key }, overrideAccess: true, req })
    if (oldKey && oldKey !== key && isBrandKey(oldKey)) await env.R2.delete(oldKey)
    revalidatePath('/', 'layout')
    revalidatePath('/settings/branding')
    return Response.json({ ok: true, key })
  } catch (error) {
    await env.R2.delete(key)
    console.error('brand metadata write failed', error)
    return Response.json({ error: 'Unable to save the brand asset.' }, { status: 500 })
  }
}

/** Owner-only removal for a configured brand asset. */
// eslint-disable-next-line max-statements -- delete mirrors the upload transaction and refreshes both caches.
export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const { asset } = await params
  if (!isBrandAsset(asset)) return new Response('Not found', { status: 404 })
  const payload = await getPayload({ config })
  const context = await authenticate(payload, request)
  if (context === null) return unauthorized()
  if (context.role !== 'owner') return forbidden()
  const req = requestForUser(payload, context.user)
  const settings = (await payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: false,
    req,
  })) as unknown as Record<string, unknown>
  const oldKey = assetKey(asset, settings)
  const { env } = await getCloudflareContext({ async: true })
  if (oldKey && isBrandKey(oldKey)) await env.R2.delete(oldKey)
  const field = asset === 'logo' ? 'logoFileKey' : 'faviconFileKey'
  await payload.updateGlobal({ slug: 'settings', data: { [field]: null }, overrideAccess: true, req })
  revalidatePath('/', 'layout')
  revalidatePath('/settings/branding')
  return Response.json({ ok: true })
}
