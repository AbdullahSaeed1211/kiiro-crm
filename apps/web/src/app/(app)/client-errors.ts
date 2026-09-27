import { ERROR_COPY } from '../../i18n/error-copy'
import { catalogFor } from '../../i18n/locale'

/**
 * Logs an error to the console with a context label and returns user-facing copy.
 * Distinguishes between network failures ("Check your connection and try again.")
 * and server failures ("Something went wrong on our side. Try again.").
 *
 * @param error The caught error (typically from a fetch/action call)
 * @param context A label for the console message (e.g., "invitation resend")
 * @param locale The user's locale for returned copy (defaults to 'en')
 * @returns User-facing error message appropriate to the failure type
 */
export function describeClientError(error: unknown, context: string, locale?: unknown): string {
  const copy = catalogFor(ERROR_COPY, locale ?? 'en')
  const isNetworkError =
    error instanceof TypeError ||
    (error instanceof Error && error.message === 'Failed to fetch') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)

  // Log the actual error for debugging/support
  console.error(`[${context}]`, error)

  return isNetworkError ? copy.networkFailure : copy.serverFailure
}
