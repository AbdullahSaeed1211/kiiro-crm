import { updateOrganization } from '@ops/module-crm'
import { crmRecordRoutes } from '../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

export const { GET, PATCH } = crmRecordRoutes({
  noun: 'organizations',
  type: 'organization',
  update: updateOrganization,
})
