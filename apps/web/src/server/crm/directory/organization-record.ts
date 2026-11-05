import { createCrmRepository } from '@ops/adapter-payload'
import type { OrganizationRecord } from '@ops/module-crm'
import { cache } from 'react'
import { getRequestContext } from '../../container'

/**
 * One client's record, read once per request. The client page, its details panel and its custom-fields panel each
 * asked for it, which was three identical reads; they now share this one.
 */
export const getOrganizationRecord = cache(async (id: string) => {
  const context = await getRequestContext()
  return createCrmRepository(context.req).get('organization', id as OrganizationRecord['id'])
})
