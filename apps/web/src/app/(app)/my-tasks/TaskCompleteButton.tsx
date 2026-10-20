'use client'

import { completeTask } from '../../../server/actions/work/tasks/completeTask'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { useCallback, useState } from 'react'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { MY_TASKS_COPY } from '../../../i18n/my-tasks-copy'

export function TaskCompleteButton({ taskId, updatedAt }: Readonly<{ taskId: string; updatedAt: number }>) {
  const router = useRouter()
  const copy = catalogFor(MY_TASKS_COPY, useLocale())
  const [isLoading, setIsLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleComplete = useCallback(
    (checked: boolean) => {
      if (!checked) return
      setIsLoading(true)
      setFailed(false)
      void completeTask(taskId, updatedAt).then((result) => {
        if (result.ok) {
          router.refresh()
        } else {
          setFailed(true)
        }
        setIsLoading(false)
      })
    },
    [taskId, updatedAt, router],
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
