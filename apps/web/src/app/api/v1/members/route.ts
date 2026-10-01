import { apiRoute } from '../../../../server/api/http'
import { listMemberRecords } from '../../../../server/api/identity-lists'

export const dynamic = 'force-dynamic'

/** `members.list` */
export const GET = apiRoute(({ request, context }) => listMemberRecords(context, new URL(request.url)))
