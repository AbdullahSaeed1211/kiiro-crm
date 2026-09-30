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
      <button
        className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        type="button"
        disabled={pending}
        onClick={() => {
          onSave()
        }}
      >
        {buttonLabel}
      </button>
      {onCancel ? (
        <button
          className="h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      ) : null}
    </div>
  )
}
