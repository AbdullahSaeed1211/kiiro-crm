import { moveDeal } from '@ops/module-crm'
import { crmActionRoute } from '../../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

export const POST = crmActionRoute({ contract: 'deals.move', idKey: 'dealId', run: moveDeal })
