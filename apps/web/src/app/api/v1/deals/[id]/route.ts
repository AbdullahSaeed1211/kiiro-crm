import { archiveRoute } from '../../../../../server/api/archive-routes'
import { updateDeal } from '@ops/module-crm'
import { crmRecordRoutes } from '../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

/** `deals.archive`: archives the record. */
export const DELETE = archiveRoute('deal')

export const { GET, PATCH } = crmRecordRoutes({ noun: 'deals', type: 'deal', update: updateDeal })
