import { ok } from '@ops/kernel'
import { apiRoute } from '../../../../../server/api/http'
import { loadNavCounts } from '../../../../../server/queries/nav-counts'

export const dynamic = 'force-dynamic'

/** `nav.counts` */
export const GET = apiRoute(async ({ context }) => ok(await loadNavCounts(context)))
