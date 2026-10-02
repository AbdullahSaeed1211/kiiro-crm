'use client'

import { Button } from '@ops/ui/components/ui/button'
import { DataTable, type DataTableProps } from '@ops/ui/composites/DataTable'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../use-guarded-transition'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { completeTasks } from '../../../server/actions/work/tasks/completeTasks'
import { updateTasks } from '../../../server/actions/work/tasks/updateTasks'

type Versions = ReadonlyMap<string, number>

const PRIORITIES = [
  ['none', 'None'],
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
  ['urgent', 'Urgent'],
] as const

const summary = (done: number, skipped: number): string => `${String(done)} changed, ${String(skipped)} skipped`

function BulkBar({ ids, versions }: Readonly<{ ids: readonly string[]; versions: Versions }>) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [priority, setPriority] = useState('')
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const tasks = ids.flatMap((id) => {
    const updatedAt = versions.get(id)
    return updatedAt === undefined ? [] : [{ id, updatedAt }]
  })
  const run = (work: () => Promise<string>) => {
    startTransition(async () => {
      setMessage(await work())
      setPriority('')
      router.refresh()
    })
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bulk actions">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => {
          run(async () => {
            const result = await completeTasks({ tasks })
            return summary(result.completed, result.skipped)
          })
        }}
      >
        Mark {ids.length} done
      </Button>
      <NativeSelect
        size="sm"
        aria-label="Set priority"
        value={priority}
        disabled={pending}
        onChange={(event) => {
          const value = event.target.value
          setPriority(value)
          if (value !== '')
            run(async () => {
              const result = await updateTasks({ tasks, change: { priority: value } })
              return summary(result.updated, result.skipped)
            })
        }}
      >
        <option value="">Set priority…</option>
        {PRIORITIES.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </NativeSelect>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          run(async () => {
            const result = await updateTasks({ tasks, change: { addAssignee: 'me' } })
            return summary(result.updated, result.skipped)
          })
        }}
      >
        Assign to me
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
