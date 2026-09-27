import { Button } from '@ops/ui/components/ui/button'
import { SheetFooter, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import type { TaskSheetLabels } from './types'

/** Title block: a sheet header in the panel, a page heading on the full page. */
export function TaskHeading({
  title,
  labels,
  asPage,
}: Readonly<{ title: string; labels: TaskSheetLabels; asPage: boolean }>) {
  if (!asPage) {
    return (
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
    )
  }
  return (
    <div className="border-b px-4 py-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{labels.task}</p>
      <h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>
    </div>
  )
}

function completeLabel({
  labels,
  terminal,
  completing,
}: Readonly<{ labels: TaskSheetLabels; terminal: boolean; completing: boolean }>): string {
  if (completing) return terminal ? labels.reopening : labels.completing
  return terminal ? labels.reopen : labels.complete
}

/** Complete or reopen, plus Close in the panel. */
export function TaskActionsBar({
  labels,
  asPage,
  terminal,
  completing,
  canUpdate,
  onComplete,
  onClose,
}: Readonly<{
  labels: TaskSheetLabels
  asPage: boolean
  terminal: boolean
  completing: boolean
  canUpdate: boolean
  onComplete: () => void
  onClose: () => void
}>) {
  const label = completeLabel({ labels, terminal, completing })
  const complete = canUpdate ? (
    <Button className={asPage ? undefined : 'flex-1'} onClick={onComplete} disabled={completing}>
      {label}
    </Button>
  ) : null
  if (asPage) return <div className="flex gap-2 border-t px-4 py-3">{complete}</div>
  return (
    <SheetFooter className="shrink-0 flex-row border-t">
      {complete}
      <Button className="flex-1" variant="outline" onClick={onClose}>
        {labels.close}
      </Button>
    </SheetFooter>
  )
}

/** Save outcome announced to assistive technology. */
export function TaskMessage({ message }: Readonly<{ message: string | null }>) {
  if (message === null) return null
  return (
    <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
      {message}
    </p>
  )
}
