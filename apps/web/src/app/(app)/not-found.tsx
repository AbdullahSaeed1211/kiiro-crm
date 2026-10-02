import { buttonVariants } from '@ops/ui/components/ui/button'
import { EmptyState } from '@ops/ui/composites/EmptyState'
import { PageContent } from '@ops/ui/composites/AppShell'
import { FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { NOT_FOUND_COPY } from '../../i18n/not-found-copy'
import { catalogFor } from '../../i18n/locale'
import { loadWorkspaceLocale } from '../../server/queries/work/read-models'

/** The page for a missing record or a route the person may not open: says what happened and offers a way back. */
export default async function AppNotFound() {
  const copy = catalogFor(NOT_FOUND_COPY, await loadWorkspaceLocale())
  return (
    <PageContent>
      <EmptyState
        icon={FileQuestion}
        title={copy.title}
        description={copy.body}
        action={
          <Link href="/" className={buttonVariants()}>
            {copy.home}
          </Link>
        }
      />
    </PageContent>
  )
}
