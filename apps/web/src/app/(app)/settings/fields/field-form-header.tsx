import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { FieldDefinition } from './field-constants'
import { RECORD_TYPES, TYPES, capitalize } from './field-constants'

interface FieldFormHeaderProps {
  readonly value: FieldDefinition
  readonly onChange: (field: FieldDefinition) => void
}

export function FieldFormHeader({ value, onChange }: Readonly<FieldFormHeaderProps>) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Record type</span>
        <NativeSelect
          value={value.recordType}
          onChange={(event) => {
            onChange({ ...value, recordType: event.target.value })
          }}
        >
          {RECORD_TYPES.map((type) => (
            <option key={type} value={type}>
              {capitalize(type)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="font-medium">Field type</span>
        <NativeSelect
          value={value.type}
          onChange={(event) => {
            onChange({ ...value, type: event.target.value })
          }}
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {capitalize(type)}
            </option>
          ))}
        </NativeSelect>
      </label>
    </div>
  )
}
