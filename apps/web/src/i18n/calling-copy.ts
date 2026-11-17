import type { Locale } from './locale'
import type { CallingCopy } from './calling-copy-types'
import { callingCopyEn } from './calling-copy-en'
import { callingCopyEs } from './calling-copy-es'
export type { CallingCopy } from './calling-copy-types'

export const CALLING_COPY: Readonly<Record<Locale, CallingCopy>> = {
  en: callingCopyEn,
  es: callingCopyEs,
}
