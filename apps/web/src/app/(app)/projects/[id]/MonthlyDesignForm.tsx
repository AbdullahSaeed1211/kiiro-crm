'use client'

import type { MonthlyDesignConfig } from '@ops/module-work'
import { useState } from 'react'
import { catalogFor } from '../../../../i18n/locale'
import { useLocale } from '../../../../i18n/locale-context'
import { MONTHLY_DESIGN_COPY } from '../../../../i18n/monthly-design-copy'
import {
  initialMonthlyDesignDraft,
  submitMonthlyDesignDraft,
  updateMonthlyDesignAssignees,
  type MonthlyDesignFormValues,
  type MonthlyDesignPerson,
} from './monthly-design-form-state'
import { MonthlyDesignFormFields, MonthlyDesignFormMessage, MonthlyDesignFormTitle } from './MonthlyDesignFormParts'

export type { MonthlyDesignFormValues, MonthlyDesignPerson } from './monthly-design-form-state'

export function MonthlyDesignForm({
  initial,
  people,
  pending,
  error,
  onSave,
  onCancel,
}: Readonly<{
  initial: MonthlyDesignConfig | null
  people: readonly MonthlyDesignPerson[]
  pending: boolean
  error: string
  onSave: (values: MonthlyDesignFormValues) => void
  onCancel: () => void
}>) {
  const copy = catalogFor(MONTHLY_DESIGN_COPY, useLocale())
  const [draft, setDraft] = useState(() => initialMonthlyDesignDraft(initial, people, copy.titlePlaceholder))
  const [fieldError, setFieldError] = useState('')

  function updateAssignee(id: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      assigneeIds: updateMonthlyDesignAssignees({ current: current.assigneeIds, id, checked }),
    }))
  }

  return (
    <form
      className="grid gap-4 border-t pt-4"
      onSubmit={(event) => {
        submitMonthlyDesignDraft({
          event,
          draft,
          copy,
          onSave,
          onValidationError: setFieldError,
        })
      }}
    >
      <MonthlyDesignFormTitle draft={draft} pending={pending} onChange={setDraft} />
      <MonthlyDesignFormFields
        draft={draft}
        people={people}
        pending={pending}
        onDraftChange={setDraft}
        onToggle={updateAssignee}
      />
      <MonthlyDesignFormMessage fieldError={fieldError} error={error} pending={pending} onCancel={onCancel} />
    </form>
  )
}
