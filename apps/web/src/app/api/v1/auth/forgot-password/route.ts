/* eslint-disable complexity -- the route intentionally collapses all account states into one safe response while preserving rate-limit errors. */
import { authBody, errorResponse, payloadForAuth, stringOf } from '../../../../../server/auth/api'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../../../../../server/capabilities'
import { failure, success } from '../../../../../server/api/respond'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const email = stringOf(body, 'email')?.toLowerCase()
  if (email === undefined) return failure('VALIDATION', 'Email is required.')
  const { env } = await getCloudflareContext({ async: true })
  if (!isOutboundEmailEnabled(env.MAIL_TRANSPORT)) return failure('UNAVAILABLE', OUTBOUND_EMAIL_DISABLED_MESSAGE)
  try {
    const payload = await payloadForAuth()
    await payload.forgotPassword({ collection: 'users', data: { email } })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 429)
      return errorResponse(error)
  }
  return success({ message: 'If an account exists, we sent a reset link.' })
}
