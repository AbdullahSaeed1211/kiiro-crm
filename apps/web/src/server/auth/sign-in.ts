import { TWO_FACTOR_REQUIRED } from '@ops/adapter-payload'
import type { Payload } from 'payload'
import { jsonWithCookie, payloadData, stringOf } from './api'
import { errorResponse } from './request'
import { checkTwoFactorCode } from './two-factor'

function safeRedirect(value: string | undefined): string {
  return value?.startsWith('/') === true && !value.startsWith('//') ? value : '/'
}

function done(payload: Payload, token: unknown, body: Record<string, unknown>): Response {
  if (typeof token !== 'string') throw new Error('Login did not return a session token.')
  return jsonWithCookie(payload, token, { redirect: safeRedirect(stringOf(body, 'next')) })
}

async function userIdOf(payload: Payload, email: string): Promise<string> {
  const found = await payloadData(payload).find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const id = found.docs[0]?.id
  if (id === undefined) throw new Error('User not found.')
  return String(id)
}

const codeResponse = (message: string, status: number): Response =>
  Response.json({ error: message, twoFactor: status !== 429 }, { status })

/** The password was right and the account asks for a code: ask for it, or check it and finish signing in. */
async function withCode(payload: Payload, input: { email: string; password: string; body: Record<string, unknown> }) {
  const code = stringOf(input.body, 'code')
  if (code === undefined) return codeResponse('Enter the code from your authenticator app, or a recovery code.', 401)
  const verdict = await checkTwoFactorCode({ payload, userId: await userIdOf(payload, input.email), code })
  if (verdict === 'locked') return codeResponse('Too many wrong codes. Try again in 10 minutes.', 429)
  if (verdict === 'wrong') return codeResponse('That code is not right. Try again.', 401)
  const result = await payload.login({
    collection: 'users',
    data: { email: input.email, password: input.password },
    context: { twoFactorVerified: true },
  })
  return done(payload, result.token, input.body)
}

/** Password sign-in, plus the authenticator code for accounts that turned the second step on. */
export async function signIn(
  payload: Payload,
  input: { email: string; password: string; body: Record<string, unknown> },
): Promise<Response> {
  try {
    const result = await payload.login({ collection: 'users', data: { email: input.email, password: input.password } })
    return done(payload, result.token, input.body)
  } catch (error) {
    if (error instanceof Error && error.message === TWO_FACTOR_REQUIRED) return withCode(payload, input)
    return errorResponse(error, 'Email or password is incorrect.')
  }
}
