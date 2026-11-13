'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Play, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import type { Locale } from '../../i18n/locale'
import { updateCurrentFocus } from '../../server/actions/work/tasks/currentFocus'

/** Shared start/stop control for a task row and the Today focus summary. */
export function CurrentFocusButton({
  taskId,
  active,
  locale,
}: Readonly<{ taskId: string; active: boolean; locale: Locale }>) {
  const router = useRouter()
  const copy = DASHBOARD_TODAY_COPY[locale]
  const label = active ? copy.stopWorking : copy.startWorking
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const description = failed ? copy.focusFailed : label
  async function update() {
    if (pending) return
    setPending(true)
    setFailed(false)
    try {
      const result = await updateCurrentFocus(active ? { action: 'stop' } : { action: 'start', taskId })
      if (result.ok) router.refresh()
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      disabled={pending}
      onClick={() => void update()}
      aria-label={description}
      title={description}
    >
      {active ? <Square aria-hidden className="size-3.5 fill-current" /> : <Play aria-hidden className="size-4" />}
      {label}
    </Button>
  )
}
