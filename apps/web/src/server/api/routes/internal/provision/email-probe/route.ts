import { getCloudflareContext } from '@opennextjs/cloudflare'
import { CloudflareMailSender, rejectUnauthorized } from '@ops/adapter-cloudflare'
import { isOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../../../../../capabilities'

/** Sends one message to the tenant's configured probe recipient through the Email Service binding; sends nothing when none is set. */
export async function POST(request: Request): Promise<Response> {
  const { env } = await getCloudflareContext({ async: true })
  const unauthorized = await rejectUnauthorized(request, env.INTERNAL_SECRET)
  if (unauthorized !== undefined) return unauthorized
  if (!isOutboundEmailEnabled(env.MAIL_TRANSPORT))
    return Response.json({ ok: true, disabled: true, message: OUTBOUND_EMAIL_DISABLED_MESSAGE })
  const recipient = env.MAIL_PROBE_RECIPIENT.trim()
  if (recipient === '') return Response.json({ ok: true, skipped: true, message: 'No probe recipient is configured.' })
  const result = await new CloudflareMailSender(env.EMAIL).send({
    from: env.MAIL_FROM_ADDRESS,
    to: [recipient],
    subject: 'Workspace email delivery check',
    html: '<p>Email delivery is configured for this workspace.</p>',
    text: 'Email delivery is configured for this workspace.',
  })
  return result.ok
    ? Response.json({ ok: true, messageId: result.value.messageId })
    : Response.json({ ok: false, error: result.error.code }, { status: 502 })
}
