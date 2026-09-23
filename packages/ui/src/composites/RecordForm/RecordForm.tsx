'use client'

import { useRef, useState, type ChangeEvent, type SyntheticEvent } from 'react'
import { Button } from '@ops/ui/components/ui/button'
import { Label } from '@ops/ui/components/ui/label'
import { Input } from '@ops/ui/components/ui/input'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { cn } from '@ops/ui/lib/utils'
import { formValues, validateRequired, type FormValue, type RecordFieldConfig, type RecordFormValues } from './form'

export type RecordFormLabels = Readonly<{
  submit: string
  saving: string
  cancel: string
  required: string
}>

export type RecordFormProps = Readonly<{
  fields: readonly RecordFieldConfig[]
  initialValues?: RecordFormValues
  labels: RecordFormLabels
  onSubmit: (values: Record<string, FormValue>) => void | Promise<void>
  onCancel?: () => void
  className?: string | undefined
}>

function inputValue(value: FormValue | undefined): string | number {
  return value ?? ''
}

type RecordFieldProps = Readonly<{
  field: RecordFieldConfig
  value: FormValue | undefined
  error: string | undefined
  pending: boolean
  setValue: (name: string, value: FormValue) => void
}>

type FieldCommonProps = Readonly<{
  id: string
  name: string
  required?: boolean | undefined
  maxLength?: number | undefined
  disabled: boolean
  placeholder?: string | undefined
  value: string | number
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  'aria-invalid'?: boolean | undefined
  'aria-describedby'?: string | undefined
}>

function FieldControl({ field, common }: Readonly<{ field: RecordFieldConfig; common: FieldCommonProps }>) {
  if (field.type === 'textarea') return <Textarea {...common} inputMode={field.inputMode} />
  if (field.type === 'select') {
    return (
      <select {...common} className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm">
        <option value="">{field.placeholder ?? ''}</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }
  return <Input {...common} type={field.type ?? 'text'} inputMode={field.inputMode} />
}

function FieldHelp({
  id,
  field,
  error,
}: Readonly<{ id: string; field: RecordFieldConfig; error: string | undefined }>) {
  if (error === undefined && field.description === undefined) return null
  return (
    <p
      id={`${id}-help`}
      className={cn('text-xs text-muted-foreground', error === undefined ? null : 'text-destructive')}
    >
      {error ?? field.description}
    </p>
  )
}

function RecordField({ field, value, error, pending, setValue }: RecordFieldProps) {
  const id = `record-field-${field.name}`
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const raw = event.target.value
    setValue(field.name, field.type === 'number' && raw !== '' ? Number(raw) : raw)
  }
  const common = {
    id,
    name: field.name,
    required: field.required,
    maxLength: field.maxLength,
    disabled: field.disabled === true || pending,
    placeholder: field.placeholder,
    value: inputValue(value),
    onChange: handleChange,
    'aria-invalid': error !== undefined ? true : undefined,
    'aria-describedby': error !== undefined || field.description !== undefined ? `${id}-help` : undefined,
  }
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      <FieldControl field={field} common={common} />
      <FieldHelp id={id} field={field} error={error} />
    </div>
  )
}

/** Field-config-driven create/edit form. It owns only local input state and calls the supplied submit handler. */
export function RecordForm({ fields, initialValues = {}, labels, onSubmit, onCancel, className }: RecordFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<Record<string, FormValue>>(() => formValues(fields, initialValues))
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({})
  const [pending, setPending] = useState(false)
  const setValue = (name: string, value: FormValue) => {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => {
      if (!(name in current)) return current
      return Object.fromEntries(Object.entries(current).filter(([key]) => key !== name))
    })
  }
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateRequired(fields, values, labels.required)
    setErrors(nextErrors)
    const firstInvalidField = fields.find((field) => field.name in nextErrors)
    if (firstInvalidField !== undefined) {
      const control = formRef.current?.elements.namedItem(firstInvalidField.name)
      if (control instanceof HTMLElement) control.focus()
      return
    }
    setPending(true)
    try {
      await onSubmit(values)
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      ref={formRef}
      className={cn('flex max-w-2xl flex-col gap-5', className)}
      onSubmit={(event) => void submit(event)}
      noValidate
    >
      {fields.map((field) => (
        <RecordField
          key={field.name}
          field={field}
          value={values[field.name]}
          error={errors[field.name]}
          pending={pending}
          setValue={setValue}
        />
      ))}
      <div className="flex justify-end gap-2">
        {onCancel === undefined ? null : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              onCancel()
            }}
          >
            {labels.cancel}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? labels.saving : labels.submit}
        </Button>
      </div>
    </form>
  )
}
