import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isOutboundEmailEnabled } from '../email-capability'

export { OUTBOUND_EMAIL_DISABLED_MESSAGE, isOutboundEmailEnabled } from '../email-capability'

/** Reads the tenant-scoped outbound email capability from Worker configuration. */
export async function getOutboundEmailEnabled(): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true })
  return isOutboundEmailEnabled(env.MAIL_TRANSPORT)
}
