import { ERROR_COPY } from '../../i18n/error-copy'
import { catalogFor } from '../../i18n/locale'

function isNetworkFailure(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true
  return error instanceof TypeError || (error instanceof Error && error.message === 'Failed to fetch')
}

/**
 * Logs a failed client request under a context label and returns the copy to show: the connection message when
 * the request never reached the server, otherwise the caller's message for that action.
 */
export function describeClientError(
  error: unknown,
  { context, fallback, locale }: Readonly<{ context: string; fallback: string; locale?: unknown }>,
): string {
  console.error(`[${context}]`, error)
  return isNetworkFailure(error) ? catalogFor(ERROR_COPY, locale ?? 'en').networkFailure : fallback
}
