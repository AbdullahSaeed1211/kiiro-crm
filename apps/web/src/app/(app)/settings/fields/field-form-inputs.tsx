import type { FieldDefinition } from './field-constants'

interface FieldFormInputsProps {
  readonly value: FieldDefinition
  readonly onChange: (field: FieldDefinition) => void
}

export function FieldFormInputs({ value, onChange }: Readonly<FieldFormInputsProps>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Field key</span>
        <input
          className="h-10 rounded-md border bg-background px-3"
          maxLength={80}
          placeholder="e.g. preferred_channel"
          value={value.key}
          onChange={(event) => {
            onChange({ ...value, key: event.target.value })
          }}
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Label</span>
        <input
          className="h-10 rounded-md border bg-background px-3"
          maxLength={120}
          value={value.label}
          onChange={(event) => {
            onChange({ ...value, label: event.target.value })
          }}
        />
      </label>
    </div>
  )
}
