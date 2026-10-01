import { restoreRoute } from '../../../../../../server/api/archive-routes'

export const dynamic = 'force-dynamic'

/** `deals.restore`: brings an archived record back. */
export const POST = restoreRoute('deal')
