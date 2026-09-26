'use client'

import { completeTask } from '../../../server/actions/work/tasks/completeTask'
import { useRouter } from 'next/navigation'
import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { useCallback, useState } from 'react'

export function TaskCompleteButton({ taskId, updatedAt }: Readonly<{ taskId: string; updatedAt: number }>) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleComplete = useCallback(
    (checked: boolean) => {
      if (!checked) return
      setIsLoading(true)
      void completeTask(taskId, updatedAt).then((result) => {
        if (result.ok) {
          router.refresh()
        }
        setIsLoading(false)
      })
    },
    [taskId, updatedAt, router],
  )

  return <Checkbox checked={false} onCheckedChange={handleComplete} disabled={isLoading} aria-label="Complete task" />
}
