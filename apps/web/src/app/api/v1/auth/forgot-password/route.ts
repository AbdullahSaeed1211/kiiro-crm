import { bodyOf, errorResponse, payloadForAuth, stringOf } from '../../../../../server/auth/api'

export async function POST(request: Request): Promise<Response> {
  const body = await bodyOf(request)
  const email = stringOf(body, 'email')?.toLowerCase()
  if (email === undefined) return Response.json({ error: 'Email is required.' }, { status: 400 })
  try {
    const payload = await payloadForAuth()
    await payload.forgotPassword({ collection: 'users', data: { email } })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 429)
      return errorResponse(error)
  }
  return Response.json({ message: 'If an account exists, we sent a reset link.' })
}
