import { archiveRoute } from '../../../../../server/api/archive-routes'
import { updateContact } from '@ops/module-crm'
import { crmRecordRoutes } from '../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

/** `contacts.archive`: archives the record. */
export const DELETE = archiveRoute('contact')

export const { GET, PATCH } = crmRecordRoutes({ noun: 'contacts', type: 'contact', update: updateContact })
