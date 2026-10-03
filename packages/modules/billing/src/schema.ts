import { z } from 'zod'

const text = z.string().trim().min(1).max(300)
const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()

/** One line of a quote or invoice. Quantity is in thousandths so 1.5 hours is 1500. */
const lineSchema = z
  .object({
    description: text,
    quantityMilli: z.number().int().min(1).max(1_000_000_000),
    unitPriceMinor: z.number().int().min(0).max(1_000_000_000_000),
    taxBps: z.number().int().min(0).max(10_000),
  })
  .strict()

const documentKindSchema = z.enum(['quote', 'invoice'])

const currency = z
  .string()
  .regex(/^[A-Za-z]{3}$/u)
  .transform((value) => value.toUpperCase())

const epoch = z.number().int().min(0).nullable().optional()

export const createDocumentSchema = z
  .object({
    kind: documentKindSchema,
    organizationId: z.string().trim().min(1),
    dealId: z.string().trim().min(1).nullable().optional(),
    contactId: z.string().trim().min(1).nullable().optional(),
    currency,
    lines: z.array(lineSchema).min(1).max(100),
    note: optionalText,
    /** A quote's valid-until time, or an invoice's due time. */
    dueAt: epoch,
    paymentLink: z.url().max(500).nullable().optional(),
  })
  .strict()

export const updateDocumentSchema = z
  .object({
    id: z.string().trim().min(1),
    expectedUpdatedAt: z.number().int().min(0),
    patch: z
      .object({
        contactId: z.string().trim().min(1).nullable().optional(),
        lines: z.array(lineSchema).min(1).max(100).optional(),
        note: optionalText,
        dueAt: epoch,
        paymentLink: z.url().max(500).nullable().optional(),
      })
      .strict(),
  })
  .strict()

export const statusChangeSchema = z
  .object({
    id: z.string().trim().min(1),
    expectedUpdatedAt: z.number().int().min(0),
    to: z.enum(['sent', 'accepted', 'declined', 'paid', 'void']),
  })
  .strict()

export const invoiceFromQuoteSchema = z.object({ quoteId: z.string().trim().min(1), dueAt: epoch }).strict()

export type DocumentLine = z.infer<typeof lineSchema>
export type DocumentKind = z.infer<typeof documentKindSchema>
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
