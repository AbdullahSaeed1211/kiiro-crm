import { z } from 'zod'

const MAX_TEMPLATES = 30

/** Reusable email text staff can insert when writing to a lead or contact. */
export const emailTemplatesSchema = z
  .array(
    z
      .object({
        id: z.string().trim().min(1).max(64),
        name: z.string().trim().min(1).max(80),
        subject: z.string().trim().min(1).max(200),
        body: z.string().trim().min(1).max(20_000),
      })
      .strict(),
  )
  .max(MAX_TEMPLATES)

export type EmailTemplate = z.infer<typeof emailTemplatesSchema>[number]

/** Replaces `{{firstName}}` and `{{name}}` in template text; an unknown placeholder is left as written. */
export function fillTemplate(text: string, values: Readonly<{ firstName: string; name: string }>): string {
  return text.replaceAll('{{firstName}}', values.firstName).replaceAll('{{name}}', values.name)
}
