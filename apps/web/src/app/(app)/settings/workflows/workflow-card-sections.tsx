import type { WorkflowCopy } from '../../../../i18n/workflow-copy'

interface ActionButtonsProps {
  pending: 'save' | 'delete' | null
  copy: WorkflowCopy
  onSave: () => void
  onRemove: () => void
}

export function ActionButtons({ pending, copy, onSave, onRemove }: Readonly<ActionButtonsProps>) {
  return (
    <div className="flex items-center gap-3">
      <button
        className="h-10 rounded-md px-3 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          onRemove()
        }}
      >
        {pending === 'delete' ? copy.deleting : copy.delete}
      </button>
      <button
        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          onSave()
        }}
      >
        {pending === 'save' ? copy.saving : copy.save}
      </button>
    </div>
  )
}

export function MessageStatus({ message }: Readonly<{ message: string | undefined }>) {
  if (!message) return null
  return (
    <p className="text-sm text-muted-foreground" role="status">
      {message}
    </p>
  )
}
