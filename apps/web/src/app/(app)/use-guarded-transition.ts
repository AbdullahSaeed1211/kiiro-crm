'use client'

import { useTransition } from 'react'
import { catalogFor } from '../../i18n/locale'
import { ERROR_COPY } from '../../i18n/error-copy'
import { useLocale } from '../../i18n/locale-context'
import { describeClientError } from './client-errors'

/**
 * `useTransition` for async saves. When the request fails before the server answers (offline, a 500), the failure
 * goes to `report` as a message instead of replacing the page with the error screen, so the form keeps what was typed.
 */
export function useGuardedTransition(report: (message: string) => void) {
  const locale = useLocale()
  const [pending, start] = useTransition()
  const run = (task: () => Promise<void>) => {
    start(async () => {
      try {
        await task()
      } catch (caught) {
        report(
          describeClientError(caught, {
            context: 'save',
            fallback: catalogFor(ERROR_COPY, locale).saveFailed,
            locale,
          }),
        )
      }
    })
  }
  return [pending, run] as const
}
