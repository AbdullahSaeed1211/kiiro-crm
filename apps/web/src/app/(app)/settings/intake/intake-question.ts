import type { FormField } from '@ops/module-intake'

/** A configured question and the lead field that receives its answer. */
export type Question = FormField & Readonly<{ target: string }>
