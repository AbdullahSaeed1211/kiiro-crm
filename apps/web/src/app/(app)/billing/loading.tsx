'use client'

import { BILLING_COPY } from '../../../i18n/billing-copy'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { RouteLoading } from '../route-loading'

/** The list's frame paints at once; rows fill in when the server answers. */
export default function Loading() {
  const copy = catalogFor(BILLING_COPY, useLocale())
  return <RouteLoading title={copy.title} description={copy.description} />
}
