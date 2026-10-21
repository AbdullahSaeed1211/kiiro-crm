'use client'

import { Skeleton } from '@ops/ui/components/ui/skeleton'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { SHELL_COPY } from '../../i18n/config'
import { useLocale } from '../../i18n/locale-context'

/**
 * Neutral fallback for routes without a tailored loader. The destination is unknown here,
 * so only the data region is represented; page headings and controls belong to the page.
 */
export default function AppLoading() {
  const locale = useLocale()
  return (
    <>
      <AppHeader breadcrumbs={[]} />
      <PageContent>
        <div role="status" aria-label={SHELL_COPY[locale].loadingPage} aria-busy="true" className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </PageContent>
    </>
  )
}
