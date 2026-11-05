import type { RequestContext } from '@/server/container'
import { listEmailMessages, listRecordAttachments, listRelatedTasks } from '../directory/helpers'
import { gate } from '../directory/tab-gate'

/** The tabs of a lead's page; each one is built from its own reads. */
export type LeadTab = 'notes' | 'calls' | 'activity' | 'tasks' | 'files' | 'email'

const ACTIVITY_LIMIT = 30

/** The reads behind a lead's open tab; every other tab gets nothing and costs no query. */
export async function leadTabData(context: RequestContext, id: string, tab: LeadTab) {
  const only = gate(tab)
  const [activityRows, emailMessages, relatedTasks, attachments] = await Promise.all([
    only(
      'activity',
      [],
      async () =>
        (
          await context.payload.find({
            collection: 'activity',
            where: { and: [{ recordType: { equals: 'lead' } }, { recordId: { equals: id } }] },
            sort: '-occurredAt',
            depth: 0,
            limit: ACTIVITY_LIMIT,
            pagination: false,
            overrideAccess: true,
            req: context.req,
          })
        ).docs,
    ),
    only('email', [], () => listEmailMessages(context, { recordType: 'lead', recordId: id, parentAuthorized: true })),
    only('tasks', [], () => listRelatedTasks(context, 'lead', id)),
    only('files', [], () => listRecordAttachments(context, 'lead', id)),
  ])
  return { activityRows, emailMessages, relatedTasks, attachments }
}
