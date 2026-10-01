import { archiveRoute } from '../../../../../server/api/archive-routes'
import { updateLead } from '@ops/module-crm'
import { crmRecordRoutes } from '../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

/** `leads.archive`: archives the record. */
export const DELETE = archiveRoute('lead')

export const { GET, PATCH } = crmRecordRoutes({ noun: 'leads', type: 'lead', update: updateLead })
