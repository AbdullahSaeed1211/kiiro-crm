import { getCloudflareContext } from '@opennextjs/cloudflare'
import { rejectUnauthorized } from '@ops/adapter-cloudflare'

/** Verifies tenant-local R2 write/read/delete through the binding without exposing object data. */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const key = `smoke/${crypto.randomUUID()}`
  try {
    await env.R2.put(key, 'ok')
    const value = await env.R2.get(key)
    return Response.json({ ok: (await value?.text()) === 'ok' }, { status: value === null ? 503 : 200 })
  } finally {
    await env.R2.delete(key)
  }
}
