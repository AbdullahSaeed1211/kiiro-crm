import { createDeal } from '@ops/module-crm'
import { crmCollectionRoutes } from '../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

export const { GET, POST } = crmCollectionRoutes({ noun: 'deals', type: 'deal', create: createDeal })
