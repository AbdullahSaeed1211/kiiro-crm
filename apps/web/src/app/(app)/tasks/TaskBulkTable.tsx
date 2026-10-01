'use client'

import { Button } from '@ops/ui/components/ui/button'
import { DataTable, type DataTableProps } from '@ops/ui/composites/DataTable'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { completeTasks } from '../../../server/actions/work/tasks/completeTasks'

type Versions = ReadonlyMap<string, number>

function BulkBar({ ids, versions }: Readonly<{ ids: readonly string[]; versions: Versions }>) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const complete = () => {
    startTransition(async () => {
      const tasks = ids.flatMap((id) => {
        const updatedAt = versions.get(id)
        return updatedAt === undefined ? [] : [{ id, updatedAt }]
      })
      const result = await completeTasks({ tasks })
      setMessage(`${String(result.completed)} done, ${String(result.skipped)} skipped`)
      router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bulk actions">
      <Button size="sm" disabled={pending} onClick={complete}>
        Mark {ids.length} done
      </Button>
      {message === null ? null : (
        <span role="status" className="text-xs text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  )
}

/** The task table with a bar that marks the selected tasks done. */
export function TaskBulkTable({
  versions,
  ...table
}: Readonly<Omit<DataTableProps, 'bulkActions' | 'selectable'> & { versions: Readonly<Record<string, number>> }>) {
  const byId: Versions = new Map(Object.entries(versions))
  return (
    <DataTable {...table} selectable bulkActions={(ids: readonly string[]) => <BulkBar ids={ids} versions={byId} />} />
  )
}
