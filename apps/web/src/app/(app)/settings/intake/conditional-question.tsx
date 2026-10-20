'use client'

import { NativeSelect } from '@ops/ui/components/ui/native-select'
import type { Question } from './intake-question'
import { useLocale } from '../../../../i18n/locale-context'

const COPY = {
  en: { when: 'Show when', always: 'Always visible', equals: 'Answer equals' },
  es: { when: 'Mostrar cuando', always: 'Siempre visible', equals: 'La respuesta es' },
}

/** Conditions reference earlier choices only, avoiding cycles and invisible controllers. */
export function ConditionalQuestion({
  question,
  previous,
  onChange,
}: Readonly<{
  question: Question
  previous: readonly Question[]
  onChange: (question: Question) => void
}>) {
  const copy = COPY[useLocale()]
  const choices = previous.filter((field) => field.type === 'select')
  const parent = choices.find((field) => field.key === question.showWhen?.field)
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">
        {copy.when}
        <NativeSelect
          value={question.showWhen?.field ?? ''}
          onChange={(event) => {
            const selected = choices.find((field) => field.key === event.target.value)
            onChange({
              ...question,
              showWhen: selected === undefined ? undefined : { field: selected.key, equals: selected.options[0] ?? '' },
            })
          }}
        >
          <option value="">{copy.always}</option>
          {choices.map((field) => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </NativeSelect>
      </label>
      {parent === undefined ? null : (
        <label className="grid gap-1 text-sm">
          {copy.equals}
          <NativeSelect
            value={question.showWhen?.equals ?? ''}
            onChange={(event) => {
              onChange({ ...question, showWhen: { field: parent.key, equals: event.target.value } })
            }}
          >
            {parent.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
    </div>
  )
}
