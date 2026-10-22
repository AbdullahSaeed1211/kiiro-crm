import type { MonthlyDesignConfig } from '@ops/module-work'
import type { Dispatch, SetStateAction, SubmitEvent } from 'react'
import type { MonthlyDesignCopy } from '../../../../i18n/monthly-design-copy'

export type MonthlyDesignPerson = Readonly<{ id: string; name: string }>
export type MonthlyDesignFormValues = Readonly<{
  enabled: boolean
  title: string
  assigneeIds: readonly string[]
  issueDay: number
  dueDay: number
}>

export interface MonthlyDesignDraft {
  readonly enabled: boolean
  readonly title: string
  readonly assigneeIds: readonly string[]
  readonly issueDay: string
  readonly dueDay: string
}

export type MonthlyDesignDraftChange = Dispatch<SetStateAction<MonthlyDesignDraft>>

export function initialMonthlyDesignDraft(
  config: MonthlyDesignConfig | null,
  people: readonly MonthlyDesignPerson[],
  defaultTitle: string,
): MonthlyDesignDraft {
  if (config !== null)
    return {
      enabled: config.enabled,
      title: config.title,
      assigneeIds: [...config.assigneeIds],
      issueDay: String(config.issueDay),
      dueDay: String(config.dueDay),
    }
  return { enabled: people.length > 0, title: defaultTitle, assigneeIds: [], issueDay: '23', dueDay: '3' }
}

export function updateMonthlyDesignAssignees(input: {
  readonly current: readonly string[]
  readonly id: string
  readonly checked: boolean
}): string[] {
  if (!input.checked) return input.current.filter((selected) => selected !== input.id)
  if (input.current.includes(input.id)) return [...input.current]
  return [...input.current, input.id]
}

function validDay(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : null
}

function validateDraft(input: { readonly draft: MonthlyDesignDraft; readonly copy: MonthlyDesignCopy }) {
  if (input.draft.title.trim() === '') return { valid: false as const, message: input.copy.missingTitle }
  if (input.draft.enabled && input.draft.assigneeIds.length === 0)
    return { valid: false as const, message: input.copy.missingAssignee }
  const issueDay = validDay(input.draft.issueDay)
  const dueDay = validDay(input.draft.dueDay)
  if (issueDay === null || dueDay === null) return { valid: false as const, message: input.copy.invalidDay }
  return { valid: true as const, issueDay, dueDay }
}

export function submitMonthlyDesignDraft(input: {
  readonly event: SubmitEvent<HTMLFormElement>
  readonly draft: MonthlyDesignDraft
  readonly copy: MonthlyDesignCopy
  readonly onSave: (values: MonthlyDesignFormValues) => void
  readonly onValidationError: (message: string) => void
}): void {
  input.event.preventDefault()
  const validation = validateDraft({ draft: input.draft, copy: input.copy })
  if (!validation.valid) {
    input.onValidationError(validation.message)
    return
  }
  input.onValidationError('')
  input.onSave({
    enabled: input.draft.enabled,
    title: input.draft.title.trim(),
    assigneeIds: input.draft.assigneeIds,
    issueDay: validation.issueDay,
    dueDay: validation.dueDay,
  })
}
