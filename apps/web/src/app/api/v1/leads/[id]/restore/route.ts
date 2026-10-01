import { restoreRoute } from '../../../../../../server/api/archive-routes'

export const dynamic = 'force-dynamic'

/** `leads.restore`: brings an archived record back. */
export const POST = restoreRoute('lead')
