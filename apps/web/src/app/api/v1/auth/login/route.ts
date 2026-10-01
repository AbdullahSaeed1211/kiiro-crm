import { authBody, payloadForAuth, stringOf } from '../../../../../server/auth/api'
import { signIn } from '../../../../../server/auth/sign-in'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const email = stringOf(body, 'email')?.toLowerCase()
  const password = stringOf(body, 'password')
  if (email === undefined || password === undefined)
    return Response.json({ error: 'Email and password are required.' }, { status: 400 })
  return signIn(await payloadForAuth(), { email, password, body })
}
