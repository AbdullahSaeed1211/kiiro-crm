import { createLead } from '@ops/module-crm'
import { crmCollectionRoutes } from '../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

export const { GET, POST } = crmCollectionRoutes({ noun: 'leads', type: 'lead', create: createLead })
