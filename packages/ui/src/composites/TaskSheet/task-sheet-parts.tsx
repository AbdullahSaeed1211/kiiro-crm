import { Badge } from '@ops/ui/components/ui/badge'
import { Button } from '@ops/ui/components/ui/button'
import { SheetFooter, SheetHeader, SheetTitle } from '@ops/ui/components/ui/sheet'
import type { TaskSheetLabels } from './types'

/** Title block: a sheet header in the panel, a page heading on the full page. */
export function TaskHeading({
  title,
  labels,
  asPage,
  ownerOnly = false,
}: Readonly<{ title: string; labels: TaskSheetLabels; asPage: boolean; ownerOnly?: boolean }>) {
  const badge = ownerOnly ? (
    <Badge variant="secondary" className="ml-2 align-middle">
      {labels.ownerOnlyBadge}
    </Badge>
  ) : null
  if (!asPage) {
    return (
      <SheetHeader>
        <SheetTitle>
          {title}
          {badge}
        </SheetTitle>
      </SheetHeader>
    )
  }
  return (
    <div className="border-b px-4 py-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{labels.task}</p>
      <h1 className="font-heading text-xl font-semibold text-foreground">
        {title}
        {badge}
      </h1>
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

function CompleteTaskButton({
  labels,
  terminal,
  completing,
  canComplete,
  onComplete,
}: Readonly<{
  labels: TaskSheetLabels
  terminal: boolean
  completing: boolean
  canComplete: boolean
  onComplete: () => void
}>) {
  return (
    <Button className="flex-1" variant="secondary" onClick={onComplete} disabled={completing || !canComplete}>
      {completeLabel({ labels, terminal, completing })}
    </Button>
  )
}

function SaveDescriptionButton({
  labels,
  dirty,
  pending,
  onSave,
}: Readonly<{ labels: TaskSheetLabels; dirty: boolean; pending: boolean; onSave: () => void }>) {
  if (!dirty) return null
  return (
    <Button className="flex-1" onClick={onSave} disabled={pending}>
      {pending ? labels.saving : labels.saveDescription}
    </Button>
  )
}

function FooterStatus({
  labels,
  dirty,
  pending,
  saved,
  canComplete,
}: Readonly<{
  labels: TaskSheetLabels
  dirty: boolean
  pending: boolean
  saved: boolean
  canComplete: boolean
}>) {
  return (
    <>
      {!canComplete ? (
        <p className="basis-full text-xs text-muted-foreground" role="status">
          {labels.saveOrDiscardBeforeComplete}
        </p>
      ) : null}
      {saved && !dirty && !pending ? (
        <p className="text-xs text-muted-foreground" role="status">
          {labels.saved}
        </p>
      ) : null}
    </>
  )
}

/** Complete or reopen, plus Close in the panel. */
export function TaskActionsBar({
  labels,
  asPage,
  terminal,
  completing,
  canUpdate,
  canComplete,
  descriptionDirty,
  descriptionPending,
  descriptionSaved,
  onSaveDescription,
  onComplete,
  onClose,
}: Readonly<{
  labels: TaskSheetLabels
  asPage: boolean
  terminal: boolean
  completing: boolean
  canUpdate: boolean
  canComplete: boolean
  descriptionDirty: boolean
  descriptionPending: boolean
  descriptionSaved: boolean
  onSaveDescription: () => void
  onComplete: () => void
  onClose: () => void
}>) {
  const complete = canUpdate ? (
    <CompleteTaskButton
      labels={labels}
      terminal={terminal}
      completing={completing}
      canComplete={canComplete}
      onComplete={onComplete}
    />
  ) : null
  const descriptionSave = (
    <SaveDescriptionButton
      labels={labels}
      dirty={descriptionDirty}
      pending={descriptionPending}
      onSave={onSaveDescription}
    />
  )
  const status = (
    <FooterStatus
      labels={labels}
      dirty={descriptionDirty}
      pending={descriptionPending}
      saved={descriptionSaved}
      canComplete={!canUpdate || canComplete}
    />
  )
  if (asPage)
    return (
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-5">
        {status}
        {descriptionSave}
        {complete}
      </div>
    )
  return (
    <SheetFooter className="sticky bottom-0 z-10 shrink-0 flex-row flex-wrap border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {status}
      {descriptionSave}
      {complete}
      <Button className="flex-1" variant="outline" onClick={onClose}>
        {labels.close}
      </Button>
    </SheetFooter>
  )
}

/** Save outcome announced to assistive technology. Its line is always reserved so a save never moves the fields below. */
export function TaskMessage({ message }: Readonly<{ message: string | null }>) {
  return (
    <p className="-mb-2 mt-1 h-4 text-xs text-muted-foreground" role="status" aria-live="polite">
      {message}
    </p>
  )
}
