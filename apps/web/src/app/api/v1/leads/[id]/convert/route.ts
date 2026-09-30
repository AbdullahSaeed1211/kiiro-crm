import { convertLead } from '@ops/module-crm'
import { crmActionRoute } from '../../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

export const POST = crmActionRoute({ contract: 'leads.convert', idKey: 'leadId', run: convertLead })
