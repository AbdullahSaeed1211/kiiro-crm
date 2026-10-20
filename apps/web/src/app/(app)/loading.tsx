import { TableSkeleton } from '@ops/ui/composites/TableSkeleton'
import { AppHeader } from '@ops/ui/composites/AppHeader'
import { PageContent } from '@ops/ui/composites/AppShell'

/**
 * Fallback while any page without its own `loading.tsx` renders on the server, so a click shows the page's shape
 * right away instead of a stale or empty screen. It carries no text, so there is nothing to translate.
 */
export default function AppLoading() {
  return (
    <>
      <AppHeader breadcrumbs={[]} />
      <PageContent>
        <TableSkeleton rows={8} columns={5} />
      </PageContent>
    </>
  )
}
