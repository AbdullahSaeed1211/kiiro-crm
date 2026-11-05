'use client'

import { Button } from '@ops/ui/components/ui/button'
import { DataTable, type DataTableProps } from '@ops/ui/composites/DataTable'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../use-guarded-transition'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { BULK_COPY } from '../../../i18n/bulk-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { taskFormLabels } from '../../../i18n/task-form-copy'
import { completeTasks } from '../../../server/actions/work/tasks/completeTasks'
import { updateTasks } from '../../../server/actions/work/tasks/updateTasks'

type Versions = ReadonlyMap<string, number>

const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const

const PRIORITY_KEY = {
  none: 'priorityNone',
  low: 'priorityLow',
  medium: 'priorityMedium',
  high: 'priorityHigh',
  urgent: 'priorityUrgent',
} as const

function BulkBar({ ids, versions }: Readonly<{ ids: readonly string[]; versions: Versions }>) {
  const router = useRouter()
  const locale = useLocale()
  const copy = catalogFor(BULK_COPY, locale)
  const priorityCopy = taskFormLabels(locale)
  const summary = (changed: number, skipped: number): string =>
    copy.result.replace('{updated}', String(changed)).replace('{skipped}', String(skipped))
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
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={copy.group}>
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
        {copy.markDone.replace('{count}', String(ids.length))}
      </Button>
      <NativeSelect
        size="sm"
        aria-label={copy.setPriority}
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
        <option value="">{copy.setPriorityPlaceholder}</option>
        {PRIORITIES.map((value) => (
          <option key={value} value={value}>
            {priorityCopy[PRIORITY_KEY[value]]}
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
        {copy.assignToMe}
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
