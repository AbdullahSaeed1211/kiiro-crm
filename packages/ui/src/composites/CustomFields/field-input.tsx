'use client'

import { Checkbox } from '@ops/ui/components/ui/checkbox'
import { Input } from '@ops/ui/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ops/ui/components/ui/select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { DateField } from '../DateField/DateField'
import type { CustomFieldsLabels, CustomFieldValue, CustomFieldView } from './types'

type InputProps = Readonly<{
  field: CustomFieldView
  value: CustomFieldValue
  labels: CustomFieldsLabels
  locale: string
  onChange: (value: CustomFieldValue) => void
}>

const INPUT_TYPES: Partial<Record<CustomFieldView['type'], string>> = {
  number: 'number',
  currency: 'number',
  email: 'email',
  url: 'url',
}

type Selection = string | string[] | null

const selectedList = (value: CustomFieldValue): string[] => (Array.isArray(value) ? [...(value as string[])] : [])
const selectedOne = (value: CustomFieldValue): string | null => (typeof value === 'string' ? value : null)

function selectionText(selected: Selection): string | undefined {
  const text = Array.isArray(selected) ? selected.join(', ') : selected
  return text === null || text === '' ? undefined : text
}

function OptionSelect({ field, value, labels, onChange }: InputProps) {
  const multiple = field.type === 'multiSelect'
  const current = multiple ? selectedList(value) : selectedOne(value)
  return (
    <Select
      multiple={multiple}
      value={current}
      onValueChange={(next: Selection) => {
        onChange(next ?? null)
      }}
    >
      <SelectTrigger size="sm" aria-label={field.label} className="w-full">
        <SelectValue>{(selected: Selection) => selectionText(selected) ?? labels.choose}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {field.options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CheckboxInput({ field, value, onChange }: InputProps) {
  return (
    <Checkbox
      aria-label={field.label}
      checked={value === true}
      onCheckedChange={(checked) => {
        onChange(checked)
      }}
    />
  )
}

function DateInput({ field, value, labels, locale, onChange }: InputProps) {
  return (
    <DateField
      label={field.label}
      value={typeof value === 'number' ? value : null}
      locale={locale}
      placeholder={labels.noDate}
      clearLabel={labels.clearDate}
      disabled={false}
      onChange={onChange}
    />
  )
}

const asText = (value: CustomFieldValue): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''

function TextareaInput({ field, value, onChange }: InputProps) {
  return (
    <Textarea
      aria-label={field.label}
      value={asText(value)}
      rows={3}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    />
  )
}

function TextInput({ field, value, onChange }: InputProps) {
  return (
    <Input
      aria-label={field.label}
      type={INPUT_TYPES[field.type] ?? 'text'}
      value={asText(value)}
      className="h-8"
      onChange={(event) => {
        onChange(event.target.value)
      }}
    />
  )
}

const INPUTS: Partial<Record<CustomFieldView['type'], (props: InputProps) => React.JSX.Element>> = {
  select: OptionSelect,
  multiSelect: OptionSelect,
  checkbox: CheckboxInput,
  date: DateInput,
  textarea: TextareaInput,
}

/** The edit control for one custom field, chosen by its type. */
export function CustomFieldInput(props: InputProps) {
  const Control = INPUTS[props.field.type] ?? TextInput
  return <Control {...props} />
}
