/* eslint-disable max-statements */
import {
  authBody,
  errorResponse,
  passwordPolicyResponse,
  payloadForAuth,
  stringOf,
} from '../../../../../server/auth/api'
import { createLocalReq } from 'payload'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const currentPassword = stringOf(body, 'currentPassword')
  const newPassword = stringOf(body, 'newPassword')
  if (currentPassword === undefined || newPassword === undefined)
    return Response.json({ error: 'Both passwords are required.' }, { status: 400 })
  try {
    const payload = await payloadForAuth()
    const auth = await payload.auth({ headers: request.headers })
    if (auth.user === null) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    const passwordError = passwordPolicyResponse(newPassword, auth.user.email)
    if (passwordError !== undefined) return passwordError
    await payload.login({ collection: 'users', data: { email: auth.user.email, password: currentPassword } })
    const req = await createLocalReq({ user: auth.user }, payload)
    await payload.update({
      collection: 'users',
      id: auth.user.id,
      data: { password: newPassword },
      overrideAccess: true,
      req,
    })
    return Response.json({ message: 'Password changed.' })
  } catch (error) {
    return errorResponse(error, 'The current password is incorrect.')
  }
}
