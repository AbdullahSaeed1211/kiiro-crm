/* eslint-disable complexity -- the route intentionally collapses all account states into one safe response while preserving rate-limit errors. */
import { authBody, errorResponse, payloadForAuth, stringOf } from '../../../../../server/auth/api'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../../../../../server/capabilities'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const email = stringOf(body, 'email')?.toLowerCase()
  if (email === undefined) return Response.json({ error: 'Email is required.' }, { status: 400 })
  const { env } = await getCloudflareContext({ async: true })
  if (!isOutboundEmailEnabled(env.MAIL_TRANSPORT))
    return Response.json({ error: OUTBOUND_EMAIL_DISABLED_MESSAGE, code: 'EMAIL_DISABLED' }, { status: 503 })
  try {
    const payload = await payloadForAuth()
    await payload.forgotPassword({ collection: 'users', data: { email } })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 429)
      return errorResponse(error)
  }
  return Response.json({ message: 'If an account exists, we sent a reset link.' })
}
