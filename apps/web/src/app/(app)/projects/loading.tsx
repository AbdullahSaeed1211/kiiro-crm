'use client'

import { SHELL_COPY } from '../../../i18n/config'
import { catalogFor } from '../../../i18n/locale'
import { useLocale } from '../../../i18n/locale-context'
import { SECTION_HELP_COPY } from '../../../i18n/section-help-copy'
import { RouteLoading } from '../route-loading'

/** The list's frame paints at once; rows fill in when the server answers. */
export default function Loading() {
  const locale = useLocale()
  return (
    <RouteLoading title={SHELL_COPY[locale].projects} description={catalogFor(SECTION_HELP_COPY, locale).projects} />
  )
}
