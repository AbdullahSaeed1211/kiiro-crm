'use client'

import { completeTask } from '../../../server/actions/work/tasks/completeTask'
import { reopenTask } from '../../../server/actions/work/tasks/reopenTask'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { toast } from '@ops/ui/components/ui/sonner'
import { useCallback, useState } from 'react'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { MY_TASKS_COPY } from '../../../i18n/my-tasks-copy'

export function TaskCompleteButton({
  taskId,
  title,
  updatedAt,
}: Readonly<{ taskId: string; title: string; updatedAt: number }>) {
  const router = useRouter()
  const copy = catalogFor(MY_TASKS_COPY, useLocale())
  const [isLoading, setIsLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const undo = useCallback(
    (doneAt: number) => {
      void reopenTask(taskId, doneAt).then((result) => {
        if (result.ok) router.refresh()
        else toast.error(copy.undoFailed)
      })
    },
    [taskId, router, copy.undoFailed],
  )

  const handleComplete = useCallback(
    (checked: boolean) => {
      if (!checked) return
      setIsLoading(true)
      setFailed(false)
      void completeTask(taskId, updatedAt).then((result) => {
        if (result.ok) {
          const doneAt = result.data.updatedAt
          toast.success(copy.completed.replace('{title}', title), {
            action: {
              label: copy.undo,
              onClick: () => {
                undo(doneAt)
              },
            },
          })
          router.refresh()
        } else {
          setFailed(true)
        }
        setIsLoading(false)
      })
    },
    [taskId, title, updatedAt, router, copy, undo],
  )

  return (
    <Checkbox
      checked={false}
      onCheckedChange={handleComplete}
      disabled={isLoading}
      aria-label={copy.completeTask}
      aria-invalid={failed}
      title={failed ? copy.completeFailed : undefined}
    />
  )
}
