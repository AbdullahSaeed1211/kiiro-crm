import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { FieldDefinition } from './field-constants'

interface FieldFormCheckboxesProps {
  readonly value: FieldDefinition
  readonly onChange: (field: FieldDefinition) => void
}

export function FieldFormCheckboxes({ value, onChange }: Readonly<FieldFormCheckboxesProps>) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.required}
          onChange={(event) => {
            onChange({ ...value, required: event.target.checked })
          }}
        />{' '}
        Required
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.sensitive}
          onChange={(event) => {
            onChange({ ...value, sensitive: event.target.checked })
          }}
        />{' '}
        Sensitive
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={value.hidden}
          onChange={(event) => {
            onChange({ ...value, hidden: event.target.checked })
          }}
        />{' '}
        Hidden
      </label>
      <label className="inline-flex items-center gap-2">
        Visibility
        <NativeSelect
          value={value.visibility}
          onChange={(event) => {
            onChange({ ...value, visibility: event.target.value })
          }}
        >
          <option value="all">Everyone</option>
          <option value="manager_up">Managers and owners</option>
        </NativeSelect>
      </label>
    </div>
  )
}
