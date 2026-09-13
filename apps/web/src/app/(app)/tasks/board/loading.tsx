import { Skeleton } from '@ops/ui/components/ui/skeleton'

const COLUMNS = [0, 1, 2, 3]

/** Skeleton shown while the task board loads; the page renders the shell, so this fills the viewport padding alone. */
export default function TaskBoardLoading() {
  return (
    <div role="status" aria-label="Loading board" className="flex gap-3 overflow-hidden px-4 py-3 md:px-6 md:py-4">
      {COLUMNS.map((column) => (
        <div key={column} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-muted/50 p-2">
          <Skeleton className="h-7" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ))}
    </div>
  )
}
