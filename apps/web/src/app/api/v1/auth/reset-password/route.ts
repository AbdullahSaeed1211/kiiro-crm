import { bodyOf, errorResponse, jsonWithCookie, payloadForAuth, stringOf } from '../../../../../server/auth/api'

export async function POST(request: Request): Promise<Response> {
  const body = await bodyOf(request)
  const token = stringOf(body, 'token')
  const password = stringOf(body, 'password')
  if (token === undefined || password === undefined)
    return Response.json({ error: 'Token and password are required.' }, { status: 400 })
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
    return errorResponse(error, 'The reset link is invalid or expired.')
  }
}
