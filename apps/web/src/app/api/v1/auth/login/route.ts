import { bodyOf, errorResponse, jsonWithCookie, payloadForAuth, stringOf } from '../../../../../server/auth/api'

function safeRedirect(value: string | undefined): string {
  return value?.startsWith('/') === true && !value.startsWith('//') ? value : '/'
}

export async function POST(request: Request): Promise<Response> {
  const body = await bodyOf(request)
  const email = stringOf(body, 'email')?.toLowerCase()
  const password = stringOf(body, 'password')
  if (email === undefined || password === undefined)
    return Response.json({ error: 'Email and password are required.' }, { status: 400 })
  try {
    const payload = await payloadForAuth()
    const result = await payload.login({ collection: 'users', data: { email, password } })
    if (typeof result.token !== 'string') throw new Error('Login did not return a session token.')
    return jsonWithCookie(payload, result.token, { redirect: safeRedirect(stringOf(body, 'next')) })
  } catch (error) {
    return errorResponse(error, 'Email or password is incorrect.')
  }
}
