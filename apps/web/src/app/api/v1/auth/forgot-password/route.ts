import { authBody, payloadForAuth, stringOf } from '../../../../../server/auth/api'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { isOutboundEmailEnabled, OUTBOUND_EMAIL_DISABLED_MESSAGE } from '../../../../../server/capabilities'
import { failure, success } from '../../../../../server/api/respond'
import { requestPasswordResetSafely } from '../../../../../server/auth/forgot-password'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const email = stringOf(body, 'email')?.toLowerCase()
  if (email === undefined) return failure('VALIDATION', 'Email is required.')
  const { env } = await getCloudflareContext({ async: true })
  if (!isOutboundEmailEnabled(env.MAIL_TRANSPORT)) return failure('UNAVAILABLE', OUTBOUND_EMAIL_DISABLED_MESSAGE)
  const result = await requestPasswordResetSafely(async () => {
    const payload = await payloadForAuth()
    return payload.forgotPassword({ collection: 'users', data: { email } })
  })
  return success(result)
}
