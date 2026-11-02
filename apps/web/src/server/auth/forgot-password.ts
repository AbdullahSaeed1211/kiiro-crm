import { PayloadEmailSendError } from '@ops/adapter-cloudflare'

const SAFE_RESPONSE =
  "If an account exists, check your email for a reset link. If it doesn't arrive, try again later or contact your administrator."

export type PasswordResetLogger = (message: string, details: Readonly<Record<string, string>>) => void

const SAFE_ERROR_CODES: Readonly<Record<string, string>> = {
  'You do not have permission to update this user.': 'USER_MUTATION_DENIED',
  'This user update is outside your role permissions.': 'USER_ROLE_POLICY_DENIED',
  'You are not allowed to perform this action.': 'COLLECTION_ACCESS_DENIED',
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity -- each checked property is independently sanitized.
function safeErrorMetadata(error: unknown): Readonly<Record<string, string>> {
  if (typeof error !== 'object' || error === null) return {}
  const record = error as {
    readonly name?: unknown
    readonly status?: unknown
    readonly statusCode?: unknown
    readonly code?: unknown
    readonly message?: unknown
  }
  const prototype = Object.getPrototypeOf(error) as { readonly constructor?: { readonly name?: unknown } } | null
  const candidateName =
    typeof record.name === 'string' && record.name !== 'Error' ? record.name : prototype?.constructor?.name
  const errorClass =
    typeof candidateName === 'string' && /^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(candidateName)
      ? candidateName
      : undefined
  const statusValue = typeof record.statusCode === 'number' ? record.statusCode : record.status
  const status =
    typeof statusValue === 'number' && Number.isInteger(statusValue) && statusValue >= 100 && statusValue <= 599
      ? String(statusValue)
      : undefined
  const rawCode =
    typeof record.code === 'string' && /^[A-Za-z0-9_.-]{1,48}$/.test(record.code) ? record.code : undefined
  const messageCode = typeof record.message === 'string' ? SAFE_ERROR_CODES[record.message] : undefined
  const errorCode = rawCode ?? messageCode
  return {
    ...(errorClass === undefined ? {} : { errorClass }),
    ...(status === undefined ? {} : { status }),
    ...(errorCode === undefined ? {} : { errorCode }),
  }
}

function diagnostics(error: unknown, stage: string): Readonly<Record<string, string>> {
  if (error instanceof PayloadEmailSendError)
    return {
      stage,
      failure: 'email_delivery',
      code: error.code,
      ...(error.providerCode === undefined ? {} : { providerCode: error.providerCode }),
    }
  const metadata = safeErrorMetadata(error)
  return {
    stage,
    failure: metadata.status === '429' ? 'rate_limited' : 'reset_request',
    ...metadata,
  }
}

/** Runs Payload's reset flow without making account existence or mail-delivery status visible to callers. */
export async function requestPasswordResetSafely(
  request: (setStage: (stage: string) => void) => Promise<unknown>,
  logger: PasswordResetLogger = (message, details) => {
    console.error(message, details)
  },
): Promise<{ readonly message: string }> {
  let stage = 'payload_init'
  try {
    await request((nextStage) => {
      stage = nextStage
    })
  } catch (error) {
    logger('[auth.forgot-password] reset operation failed', diagnostics(error, stage))
  }
  return { message: SAFE_RESPONSE }
}
