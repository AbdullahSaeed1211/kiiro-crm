import { getCloudflareContext } from '@opennextjs/cloudflare'
import { createLoggingInboundSink, handleInboundEmailRequest } from '../../handlers'

/** Receives raw inbound email the Worker entry forwards and hands it to the inbound sink (spec §14.4). */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  return handleInboundEmailRequest(request, { secret: env.INTERNAL_SECRET, sink: createLoggingInboundSink() })
}
