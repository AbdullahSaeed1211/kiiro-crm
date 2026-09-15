import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { rejectUnauthorized } from '@ops/adapter-cloudflare'
import { SETTINGS_GLOBAL } from '@ops/adapter-payload'
import { getPayload } from 'payload'

const status = (senderStatus: unknown, onboardedAt: unknown) => ({
  migration: true,
  deployment: true,
  seed: typeof onboardedAt === 'number',
  senderStatus: senderStatus === 'verified',
})

async function authorize(request: Request) {
  const { env } = await getCloudflareContext({ async: true })
  return { env, unauthorized: await rejectUnauthorized(request, env.INTERNAL_SECRET) }
}

/** Returns only non-secret provisioning completion flags. */
export async function GET(request: Request): Promise<Response> {
  const { unauthorized } = await authorize(request)
  if (unauthorized !== undefined) return unauthorized
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: SETTINGS_GLOBAL, depth: 0, overrideAccess: true })
  return Response.json(status(settings.email.senderStatus, settings.onboardedAt))
}

/** Persists the verified Email Service flag after the provisioning CLI validates the sender domain. */
export async function POST(request: Request): Promise<Response> {
  const { unauthorized } = await authorize(request)
  if (unauthorized !== undefined) return unauthorized
  const body: unknown = await request.json().catch(() => undefined)
  if (typeof body !== 'object' || body === null || Reflect.get(body, 'senderStatus') !== true)
    return Response.json({ error: 'invalid status update' }, { status: 400 })
  const payload = await getPayload({ config })
  await payload.updateGlobal({
    slug: SETTINGS_GLOBAL,
    overrideAccess: true,
    data: { email: { senderStatus: 'verified' } },
  })
  return Response.json({ senderStatus: true })
}
