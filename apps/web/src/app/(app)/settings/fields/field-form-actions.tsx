import { Button } from '@ops/ui/components/ui/button'

interface FieldFormActionsProps {
  readonly pending: boolean
  readonly isNew?: boolean
  readonly onSave: () => void
  readonly onCancel?: () => void
}

export function FieldFormActions({ pending, isNew, onSave, onCancel }: Readonly<FieldFormActionsProps>) {
  let buttonLabel = 'Save field'
  if (pending) buttonLabel = 'Saving…'
  else if (isNew) buttonLabel = 'Add field'
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="lg"
        type="button"
        disabled={pending}
        onClick={() => {
          onSave()
        }}
      >
        {buttonLabel}
      </Button>
      {onCancel ? (
        <Button variant="outline" size="lg" type="button" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  )
}
