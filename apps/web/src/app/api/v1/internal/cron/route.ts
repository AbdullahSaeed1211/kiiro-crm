import { getCloudflareContext } from '@opennextjs/cloudflare'
import { handleCronRequest } from '@ops/adapter-cloudflare'

/** Receives the cron trigger the Worker entry forwards and runs the registered background jobs (spec §13). */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  // The registry stays empty until Payload-backed item sources and notification stores exist to build jobs from.
  return handleCronRequest(request, { secret: env.INTERNAL_SECRET, jobs: [] })
}
