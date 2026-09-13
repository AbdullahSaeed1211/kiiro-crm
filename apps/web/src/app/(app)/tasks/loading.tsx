import { TableSkeleton } from '@ops/ui/composites/TableSkeleton'

/** Skeleton shown while the tasks list loads; the page renders the shell, so this fills the viewport padding alone. */
export default function TasksLoading() {
  return (
    <div className="px-4 py-3 md:px-6 md:py-4">
      <TableSkeleton columns={7} label="Loading tasks" />
    </div>
  )
}
