import type { Locale } from './locale'
import { RECORD_COPY_EN } from './record-copy-en'
import { RECORD_COPY_ES } from './record-copy-es'

import type { RecordCopy } from './record-copy-type'

export type { RecordCopy }

/** Words and sentences shared by the record pages: contacts, organizations, leads and deals. */
export const RECORD_COPY: Readonly<Record<Locale, RecordCopy>> = {
  en: RECORD_COPY_EN,
  es: RECORD_COPY_ES,
}
