import type { FieldDefinition } from './field-constants'

interface FieldFormOptionsProps {
  readonly value: FieldDefinition
  readonly onChange: (field: FieldDefinition) => void
}

export function FieldFormOptions({ value, onChange }: Readonly<FieldFormOptionsProps>) {
  const isSelectType = value.type === 'select' || value.type === 'multiSelect'
  if (!isSelectType) return null

  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        Options <span className="font-normal text-muted-foreground">(comma separated)</span>
      </span>
      <input
        className="h-10 rounded-md border bg-background px-3"
        value={value.options.join(', ')}
        onChange={(event) => {
          onChange({
            ...value,
            options: event.target.value
              .split(',')
              .map((option) => option.trim())
              .filter(Boolean),
          })
        }}
      />
    </label>
  )
}
