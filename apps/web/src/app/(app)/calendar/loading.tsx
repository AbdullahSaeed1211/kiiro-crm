'use client'

import { TASK_COPY } from '../../../i18n/config'
import { useLocale } from '../../../i18n/locale-context'
import { RouteLoading } from '../route-loading'

/** The calendar's frame paints at once; the month fills in when the server answers. */
export default function Loading() {
  const copy = TASK_COPY[useLocale()]
  return <RouteLoading title={copy.calendar} description={copy.calendarDescription} />
}
