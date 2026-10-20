import { z } from 'zod'

const MAX_FIELDS = 20
const MAX_OPTIONS = 20

function isIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** One question on a hosted intake form. `key` is the answer name sent to intake and mapped to a lead field. */
export const formFieldsSchema = z
  .array(
    z
      .object({
        key: z
          .string()
          .trim()
          .regex(/^[a-z]\w{0,39}$/u),
        label: z.string().trim().min(1).max(80),
        type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'datetime']),
        required: z.boolean(),
        options: z.array(z.string().trim().min(1).max(80)).max(MAX_OPTIONS),
        showWhen: z
          .object({ field: z.string().min(1), equals: z.string().min(1) })
          .strict()
          .optional(),
        /** Optional per-question presentation zone. Stored answer remains a UTC Unix millisecond. */
        timeZone: z.string().trim().min(1).refine(isIanaTimeZone, 'Choose a valid IANA time zone.').optional(),
      })
      .strict(),
  )
  .max(MAX_FIELDS)
  .refine(
    (fields) => new Set(fields.map((field) => field.key)).size === fields.length,
    'Each question needs its own key.',
  )
  .refine(
    (fields) =>
      fields.every(
        (field, index) =>
          field.showWhen === undefined ||
          fields
            .slice(0, index)
            .some(
              (parent) =>
                parent.key === field.showWhen?.field &&
                parent.type === 'select' &&
                parent.options.includes(field.showWhen.equals),
            ),
      ),
    'A conditional question must use a choice from an earlier select question.',
  )
  .refine(
    (fields) => fields.every((field) => field.timeZone === undefined || field.type === 'datetime'),
    'A time zone override is only available for date and time questions.',
  )

export type FormField = z.infer<typeof formFieldsSchema>[number]
