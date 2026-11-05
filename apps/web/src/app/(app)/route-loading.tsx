'use client'

import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'
import { PageHeader } from '@ops/ui/composites/PageHeader'
import { SHELL_COPY } from '../../i18n/config'
import { useLocale } from '../../i18n/locale-context'

/**
 * A page's stable frame while its records load. Only the title and help line show, because those are the same before
 * and after the data arrives: placeholder rows of the wrong height move the real content when it replaces them.
 */
export function RouteLoading({ title, description }: Readonly<{ title: string; description?: string }>) {
  const locale = useLocale()
  return (
    <>
      <AppHeader breadcrumbs={[{ label: title }]} />
      <PageContent>
        <PageHeader title={title} description={description} />
        <span role="status" aria-busy="true" aria-label={title} className="sr-only">
          {SHELL_COPY[locale].loadingPage}
        </span>
      </PageContent>
    </>
  )
}
