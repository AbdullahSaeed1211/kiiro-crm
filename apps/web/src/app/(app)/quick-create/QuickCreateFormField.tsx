'use client'

import { Input } from '@ops/ui/components/ui/input'
import { Label } from '@ops/ui/components/ui/label'

export interface FormFieldProps {
  readonly id: string
  readonly name: string
  readonly label: string
  readonly placeholder?: string
  readonly type?: string
  readonly maxLength?: number
  readonly required?: boolean
  readonly error?: string
}

export function QuickCreateFormField({
  id,
  name,
  label,
  placeholder,
  type = 'text',
  maxLength,
  required,
  error,
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
