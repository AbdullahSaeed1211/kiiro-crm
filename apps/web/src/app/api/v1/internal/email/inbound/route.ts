import config from '@payload-config'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { handleInboundEmailRequest, rejectUnauthorized } from '@ops/adapter-cloudflare'
import { createEmailMessageSink } from '@ops/adapter-payload'
import { getPayload } from 'payload'

/** Receives raw inbound email the Worker entry forwards and stores it as an email message (spec §14.4). */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  // Authenticate before touching the database.
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  const payload = await getPayload({ config })
  return handleInboundEmailRequest(request, { secret: env.INTERNAL_SECRET, sink: createEmailMessageSink(payload) })
}
