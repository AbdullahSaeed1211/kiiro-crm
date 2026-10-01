import { authBody, payloadForAuth, stringOf } from '../../../../../server/auth/api'
import { signIn } from '../../../../../server/auth/sign-in'
import { failure } from '../../../../../server/api/respond'

export async function POST(request: Request): Promise<Response> {
  const prepared = await authBody(request)
  if (prepared instanceof Response) return prepared
  const body = prepared
  const email = stringOf(body, 'email')?.toLowerCase()
  const password = stringOf(body, 'password')
  if (email === undefined || password === undefined) return failure('VALIDATION', 'Email and password are required.')
  return signIn(await payloadForAuth(), { email, password, body })
}
