import { PayloadEmailSendError } from '@ops/adapter-cloudflare'

const SAFE_RESPONSE =
  "If an account exists, check your email for a reset link. If it doesn't arrive, try again later or contact your administrator."

export type PasswordResetLogger = (message: string, details: Readonly<Record<string, string>>) => void

function diagnostics(error: unknown): Readonly<Record<string, string>> {
  if (error instanceof PayloadEmailSendError) {
    return {
      failure: 'email_delivery',
      code: error.code,
      ...(error.providerCode === undefined ? {} : { providerCode: error.providerCode }),
    }
  }
  if (typeof error === 'object' && error !== null && 'status' in error && error.status === 429) {
    return { failure: 'rate_limited' }
  }
  return { failure: 'reset_request' }
}

/** Runs Payload's reset flow without making account existence or mail-delivery status visible to callers. */
export async function requestPasswordResetSafely(
  request: () => Promise<unknown>,
  logger: PasswordResetLogger = (message, details) => {
    console.error(message, details)
  },
): Promise<{ readonly message: string }> {
  try {
    await request()
  } catch (error) {
    logger('[auth.forgot-password] reset operation failed', diagnostics(error))
  }
  return { message: SAFE_RESPONSE }
}
