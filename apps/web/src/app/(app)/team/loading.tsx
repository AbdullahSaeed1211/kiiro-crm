'use client'

import { TEAM_ASSIGNMENTS_COPY } from '../../../i18n/team-assignments-copy'
import { useLocale } from '../../../i18n/locale-context'
import { RouteLoading } from '../route-loading'

/** The list's frame paints at once; rows fill in when the server answers. */
export default function Loading() {
  const copy = TEAM_ASSIGNMENTS_COPY[useLocale()]
  return <RouteLoading title={copy.title} description={copy.description} />
}
