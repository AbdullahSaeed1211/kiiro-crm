import { failure } from '../api/respond'

export function unauthorized(): Response {
  return failure('UNAUTHORIZED', 'Sign in to use the API.')
}

export function forbidden(): Response {
  return failure('FORBIDDEN', 'You do not have access to this.')
}

export function badRequest(message: string): Response {
  return failure('VALIDATION', message)
}

/** Converts Payload's expected not-found/access failures into one non-leaky response. */
export function payloadNotFoundOrDenied(error: unknown): Response | undefined {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (
    message.includes('not found') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('access')
  )
    return failure('NOT_FOUND', 'Not found.')
  return undefined
}
