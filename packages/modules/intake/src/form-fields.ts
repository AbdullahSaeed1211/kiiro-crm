import { z } from 'zod'

const MAX_FIELDS = 20
const MAX_OPTIONS = 20

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
        type: z.enum(['text', 'email', 'phone', 'textarea', 'select', 'checkbox']),
        required: z.boolean(),
        options: z.array(z.string().trim().min(1).max(80)).max(MAX_OPTIONS),
      })
      .strict(),
  )
  .max(MAX_FIELDS)
  .refine(
    (fields) => new Set(fields.map((field) => field.key)).size === fields.length,
    'Each question needs its own key.',
  )

export type FormField = z.infer<typeof formFieldsSchema>[number]
