'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { changeTask } from '../../../../server/actions/work/tasks/changeTask'
import { taskFormLabels } from '../../../../i18n/task-form-copy'
import { useLocale } from '../../../../i18n/locale-context'
import { RecordPicker } from '../../RecordPicker'
import type { TaskRelated } from '../../../../server/queries/work/task-details'

/**
 * The task's client. A task linked to a client (or to nothing) can be moved to another client or cleared here; a task
 * linked to a contact, lead or deal shows that link and keeps it, because changing it is not a client change.
 */
export function TaskClientField({
  taskId,
  updatedAt,
  related,
  editable,
}: Readonly<{ taskId: string; updatedAt: number; related: TaskRelated | null; editable: boolean }>) {
  const router = useRouter()
  const copy = taskFormLabels(useLocale())
  const [error, setError] = useState<string | null>(null)
  const isClient = related === null || related.type === 'organization'
  if (!isClient || !editable) {
    return related === null ? null : (
      <p className="text-sm">
        <span className="text-muted-foreground">{copy.client}: </span>
        <a className="font-medium hover:underline" href={related.href}>
          {related.label}
        </a>
      </p>
    )
  }
  const save = async (clientId: string | null) => {
    setError(null)
    const result = await changeTask({ taskId, expectedUpdatedAt: updatedAt, change: { kind: 'client', clientId } })
    if (result.ok) router.refresh()
    else setError(result.message)
  }
  return (
    <div className="grid gap-1.5 text-sm">
      <label htmlFor="task-client-edit" className="font-medium">
        {copy.client}
      </label>
      <RecordPicker
        id="task-client-edit"
        name="client"
        type="organization"
        emptyLabel={copy.noClient}
        {...(related === null ? {} : { initial: { id: related.id, name: related.label } })}
        onChoose={(option) => {
          void save(option?.id ?? null)
        }}
      />
      {error === null ? null : (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
