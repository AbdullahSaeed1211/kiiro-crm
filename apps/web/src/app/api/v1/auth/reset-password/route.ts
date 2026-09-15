/* eslint-disable complexity -- reset handling keeps token validation, password policy, session creation, and safe error mapping together. */
import {
  authBody,
  errorResponse,
  jsonWithCookie,
  passwordPolicyResponse,
  payloadForAuth,
  stringOf,
} from '../../../../../server/auth/api'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const token = stringOf(body, 'token')
  const password = stringOf(body, 'password')
  if (token === undefined || password === undefined)
    return Response.json({ error: 'Token and password are required.' }, { status: 400 })
  const passwordError = passwordPolicyResponse(password)
  if (passwordError !== undefined) return passwordError
  try {
    const payload = await payloadForAuth()
    const result = await payload.resetPassword({
      collection: 'users',
      data: { token, password },
      overrideAccess: false,
    })
    if (typeof result.token !== 'string') throw new Error('Password reset did not return a session token.')
    return jsonWithCookie(payload, result.token, { redirect: '/' })
  } catch (error) {
    const knownStatus = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined
    return knownStatus === 400
      ? Response.json({ error: 'The reset link is invalid or expired.' }, { status: 410 })
      : errorResponse(error, 'The reset link is invalid or expired.')
  }
}
