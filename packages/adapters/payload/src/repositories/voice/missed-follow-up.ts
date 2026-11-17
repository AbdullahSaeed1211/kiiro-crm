import type { PayloadRequest } from 'payload'
import type { VoiceCall } from '@ops/module-crm'
import { activeUser, canReadLead } from './shared'
import { insertUnique } from '../unique-insert'
import { COLLECTIONS } from '../../contracts/names'

export async function followUp(req: PayloadRequest, call: VoiceCall): Promise<void> {
  if (call.leadId === null) return
  const leadId = call.leadId
  const candidates = await Promise.all(
    [...new Set(call.assignedUserIds)].map(async (userId) =>
      (await activeUser(req, userId)) !== undefined && (await canReadLead(req, userId, leadId)) ? userId : undefined,
    ),
  )
  const assignees = candidates.filter((userId): userId is string => userId !== undefined)
  if (assignees.length === 0) return
  const sourceKey = `voice-call:${call.id}`
  await insertUnique(req.payload, {
    collection: COLLECTIONS.scheduleItems,
    field: 'sourceKey',
    value: sourceKey,
    data: {
      kind: 'callback',
      recordType: 'lead',
      recordId: leadId,
      assignees,
      startsAt: call.nextActionAt ?? call.endedAt ?? call.updatedAt,
      status: 'scheduled',
      title: 'Follow up on missed call',
      notes: null,
      sourceKey,
    },
  })
}
