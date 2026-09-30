import { moveLead } from '@ops/module-crm'
import { crmActionRoute } from '../../../../../../server/api/crm-record-routes'

export const dynamic = 'force-dynamic'

export const POST = crmActionRoute({ contract: 'leads.move', idKey: 'leadId', run: moveLead })
