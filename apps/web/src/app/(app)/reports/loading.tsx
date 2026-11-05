'use client'

import { REPORT_COPY } from '../../../i18n/config'
import { useLocale } from '../../../i18n/locale-context'
import { RouteLoading } from '../route-loading'

/** The list's frame paints at once; rows fill in when the server answers. */
export default function Loading() {
  const copy = REPORT_COPY[useLocale()]
  return <RouteLoading title={copy.title} description={copy.description} />
}
