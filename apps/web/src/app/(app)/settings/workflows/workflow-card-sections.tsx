import type { WorkflowCopy } from '../../../../i18n/workflow-copy'
import { Button } from '@ops/ui/components/ui/button'

interface ActionButtonsProps {
  pending: 'save' | 'delete' | null
  copy: WorkflowCopy
  onSave: () => void
  onRemove: () => void
}

export function ActionButtons({ pending, copy, onSave, onRemove }: Readonly<ActionButtonsProps>) {
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="destructive"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          onRemove()
        }}
      >
        {pending === 'delete' ? copy.deleting : copy.delete}
      </Button>
      <Button
        size="lg"
        type="button"
        disabled={pending !== null}
        onClick={() => {
          onSave()
        }}
      >
        {pending === 'save' ? copy.saving : copy.save}
      </Button>
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
