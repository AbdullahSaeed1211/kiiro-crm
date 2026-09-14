import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

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

function fallback(letter: string): Response {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#111827"/><text x="32" y="43" fill="white" font-family="sans-serif" font-size="32" text-anchor="middle">${escapeXml(letter)}</text></svg>`
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' } })
}

function assetKey(asset: string, settings: Record<string, unknown>): string | undefined {
  const keyName = asset === 'logo' ? 'logoFileKey' : 'faviconFileKey'
  const key = settings[keyName]
  return typeof key === 'string' ? key : undefined
}

function isBrandAsset(asset: string): asset is 'logo' | 'favicon' {
  return asset === 'logo' || asset === 'favicon'
}

function fallbackFor(settings: Record<string, unknown>): Response {
  const value = settings.appName
  const appName = typeof value === 'string' && value !== '' ? value : 'Workspace'
  return fallback(appName.trim().charAt(0).toUpperCase() || 'W')
}

async function streamBrandAsset(key: string): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const object = await env.R2.get(key)
  if (object === null) return new Response('Not found', { status: 404 })
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
  if (key === undefined) {
    if (asset === 'logo') return new Response('Not found', { status: 404 })
    return fallbackFor(settings)
  }
  return streamBrandAsset(key)
}
