import { domainError, type DomainError, type ErrorCode } from '@ops/kernel'

const SENDER_NOT_VERIFIED = 'E_SENDER_NOT_VERIFIED'

// A Map rather than an object literal so provider codes such as "constructor" never hit prototype keys.
const MAPPED_CODES = new Map<string, ErrorCode>([
  ['E_RATE_LIMIT_EXCEEDED', 'RATE_LIMITED'],
  ['E_VALIDATION_ERROR', 'VALIDATION'],
  [SENDER_NOT_VERIFIED, 'VALIDATION'],
])

function providerCodeOf(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined
  return typeof error.code === 'string' ? error.code : undefined
}

/**
 * Maps an error thrown by the `send_email` binding to a domain error.
 * The provider message is not copied because it can contain addresses; `details.providerCode` keeps the code.
 * @returns `RATE_LIMITED` for `E_RATE_LIMIT_EXCEEDED`; `VALIDATION` for `E_VALIDATION_ERROR` and `E_SENDER_NOT_VERIFIED`
 *   (tell them apart with `isSenderNotVerified`); `UNAVAILABLE` for every other or missing code.
 */
export function mapSendError(error: unknown): DomainError {
  const providerCode = providerCodeOf(error)
  const code = MAPPED_CODES.get(providerCode ?? '') ?? 'UNAVAILABLE'
  const message = `Email Service send failed (${providerCode ?? 'no error code'})`
  return domainError(code, message, providerCode === undefined ? undefined : { providerCode })
}

/** True when a send failed because the sender domain is not verified, so the caller may retry with the platform sender. */
export function isSenderNotVerified(error: DomainError): boolean {
  return error.details?.['providerCode'] === SENDER_NOT_VERIFIED
}
