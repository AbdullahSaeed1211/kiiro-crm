import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { CloudflareMailSender, rejectUnauthorized } from '@ops/adapter-cloudflare'
import { getPayload } from 'payload'

/** Sends one owner-addressed message through the configured Email Service binding. */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const payload = await getPayload({ config })
  const owners = await payload.find({
    collection: 'users',
    where: { and: [{ role: { equals: 'owner' } }, { active: { equals: true } }] },
    sort: 'createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (owners.totalDocs === 0)
    return Response.json({ ok: false, error: 'No active owner can receive the probe.' }, { status: 409 })
  const owner = owners.docs[0]
  const result = await new CloudflareMailSender(env.EMAIL).send({
    from: env.MAIL_FROM_ADDRESS,
    to: [owner.email],
    subject: 'Workspace email delivery check',
    html: '<p>Email delivery is configured for this workspace.</p>',
    text: 'Email delivery is configured for this workspace.',
  })
  return result.ok
    ? Response.json({ ok: true, messageId: result.value.messageId })
    : Response.json({ ok: false, error: result.error.code }, { status: 502 })
}
