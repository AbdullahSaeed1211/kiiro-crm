import { INTERNAL_SECRET_HEADER } from '../contracts/worker'
import { jsonError } from './responses'

const encoder = new TextEncoder()

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))
}

/**
 * Compares a presented internal secret with the tenant's in constant time, in Node and workerd alike.
 * Both values are hashed first so the byte loop always covers 32 bytes and its timing reveals neither length nor prefix.
 * @returns false for a missing header, an empty or unset tenant secret, or any mismatch.
 */
export async function internalSecretMatches(presented: string | null, expected: string | undefined): Promise<boolean> {
  if (presented === null || expected === undefined || expected === '') return false
  const [left, right] = await Promise.all([sha256(presented), sha256(expected)])
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }
  return difference === 0
}

/**
 * Guards an internal route: the request must carry the tenant's internal secret in `x-internal-secret`.
 * @returns `undefined` when authorized; otherwise a 401 JSON response with code `UNAUTHORIZED`.
 */
export async function rejectUnauthorized(request: Request, secret: string | undefined): Promise<Response | undefined> {
  const authorized = await internalSecretMatches(request.headers.get(INTERNAL_SECRET_HEADER), secret)
  return authorized
    ? undefined
    : jsonError(401, { code: 'UNAUTHORIZED', message: 'Missing or invalid internal secret' })
}
