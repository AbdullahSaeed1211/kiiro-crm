import type { DocumentLine } from '@ops/module-billing'
import { minorDigits, toMinor } from './money'

/** One line as typed: every value is text until the form is sent. */
export interface LineDraft {
  readonly description: string
  readonly quantity: string
  readonly price: string
  readonly tax: string
}

export const EMPTY_LINE: LineDraft = { description: '', quantity: '1', price: '', tax: '0' }

const MILLI = 1000
const BPS_PER_PERCENT = 100

/** A typed line as a stored line; `undefined` when any number is not valid. */
export function toLine(draft: LineDraft, currency: string): DocumentLine | undefined {
  const quantity = Number(draft.quantity)
  const tax = Number(draft.tax)
  const unitPriceMinor = toMinor(draft.price, currency)
  const valid =
    draft.description.trim() !== '' && quantity > 0 && tax >= 0 && tax <= 100 && unitPriceMinor !== undefined
  if (!valid) return undefined
  return {
    description: draft.description.trim(),
    quantityMilli: Math.round(quantity * MILLI),
    unitPriceMinor,
    taxBps: Math.round(tax * BPS_PER_PERCENT),
  }
}

/** Every line, or `undefined` when at least one is not valid. */
export function toLines(drafts: readonly LineDraft[], currency: string): DocumentLine[] | undefined {
  const lines = drafts.map((draft) => toLine(draft, currency))
  return lines.every((line) => line !== undefined) ? lines : undefined
}

/** A stored line as typed text, for editing. */
export function toDraft(line: DocumentLine, currency: string): LineDraft {
  return {
    description: line.description,
    quantity: String(line.quantityMilli / MILLI),
    price: (line.unitPriceMinor / 10 ** minorDigits(currency)).toFixed(minorDigits(currency)),
    tax: String(line.taxBps / BPS_PER_PERCENT),
  }
}
