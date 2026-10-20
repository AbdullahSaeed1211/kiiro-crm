import { TableSkeleton } from '@ops/ui/composites/TableSkeleton'

/**
 * Fallback while any page without its own `loading.tsx` renders on the server, so a click shows the page's shape
 * right away instead of a stale or empty screen. It carries no text, so there is nothing to translate.
 */
export default function AppLoading() {
  return (
    <div className="px-4 py-3 md:px-6 md:py-4">
      <TableSkeleton rows={8} columns={5} />
    </div>
  )
}
