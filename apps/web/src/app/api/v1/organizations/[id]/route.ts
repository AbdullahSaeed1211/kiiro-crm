import { archiveRoute } from '../../../../../server/api/archive-routes'
import { updateOrganization } from '@ops/module-crm'
import { crmRecordRoutes } from '../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

/** `organizations.archive`: archives the record. */
export const DELETE = archiveRoute('organization')

export const { GET, PATCH } = crmRecordRoutes({
  noun: 'organizations',
  type: 'organization',
  update: updateOrganization,
})
