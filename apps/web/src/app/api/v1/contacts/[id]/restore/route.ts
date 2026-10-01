import { restoreRoute } from '../../../../../../server/api/archive-routes'

export const dynamic = 'force-dynamic'

/** `contacts.restore`: brings an archived record back. */
export const POST = restoreRoute('contact')
