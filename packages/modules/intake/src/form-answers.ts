import type { FormField } from './form-fields'
import type { IntakePayload } from './contracts'

/** Only visible parent answers can activate a conditional question. */
export function visibleFormFields(fields: readonly FormField[], answers: IntakePayload): readonly FormField[] {
  const visible = new Set<string>()
  return fields.filter((field) => {
    const rule = field.showWhen
    if (rule !== undefined && (!visible.has(rule.field) || answers[rule.field] !== rule.equals)) return false
    visible.add(field.key)
    return true
  })
}

/** Hidden values are discarded; booked instants are required and stored as Unix milliseconds, never date strings. */
export function checkedFormAnswers(fields: readonly FormField[], answers: IntakePayload): IntakePayload | undefined {
  const visible = visibleFormFields(fields, answers)
  const active = new Set(visible.map((field) => field.key))
  if (!visible.every((field) => validAnswer(field, answers[field.key]))) return undefined
  const configured = new Set(fields.map((field) => field.key))
  return Object.fromEntries(Object.entries(answers).filter(([key]) => !configured.has(key) || active.has(key)))
}

const isUnix = (value: unknown): boolean =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8_640_000_000_000_000
const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === ''

function validAnswer(field: FormField, value: unknown): boolean {
  if (isEmpty(value)) return !field.required
  if (field.type === 'datetime') return isUnix(value)
  if (field.type === 'select') return typeof value === 'string' && field.options.includes(value)
  return typeof value === 'string'
}

/** Resolves a wall-clock minute in an IANA zone. DST gaps and repeated minutes are rejected, not guessed. */
export function zonedMinuteToUnix(local: string, timeZone: string): number | undefined {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u.test(local)) return undefined
  const nominal = Date.parse(`${local}:00Z`)
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 16) !== local) return undefined
  try {
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    const format = (instant: number) => {
      const parts = Object.fromEntries(formatter.formatToParts(instant).map((part) => [part.type, part.value]))
      return `${parts['year'] ?? ''}-${parts['month'] ?? ''}-${parts['day'] ?? ''}T${parts['hour'] ?? ''}:${parts['minute'] ?? ''}`
    }
    const candidates = new Set<number>()
    for (const shift of [-36, 0, 36]) {
      const probe = nominal + shift * 3_600_000
      const offset = Date.parse(`${format(probe)}:00Z`) - probe
      const candidate = nominal - offset
      if (format(candidate) === local) candidates.add(candidate)
    }
    return candidates.size === 1 ? [...candidates][0] : undefined
  } catch {
    return undefined
  }
}
