import { COLLECTIONS } from '@ops/adapter-payload'
import type { VoiceCall, VoiceOutcome } from '@ops/module-crm'
import type { PayloadRequest } from 'payload'
import { insertUnique } from '@ops/adapter-payload'
import { createVoiceRepository } from '@ops/adapter-payload'

function wrapupSourceKey(call: VoiceCall): string {
  return `voice-wrapup:${call.id}`
}

function scheduleSourceKey(callId: string, outcome: VoiceOutcome): string {
  return `voice-schedule:${callId}:${outcome}`
}

async function persistActivity(req: PayloadRequest, call: VoiceCall, actorId: string): Promise<void> {
  if (call.outcome === null || call.leadId === null) return
  const sourceKey = wrapupSourceKey(call)
  const payload = req.payload
  const prior = await payload.find({
    collection: COLLECTIONS.activity,
    where: { sourceKey: { equals: sourceKey } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const data = {
    recordType: 'lead' as const,
    recordId: call.leadId,
    actor: actorId,
    verb: 'field.changed' as const,
    data: { field: 'call.outcome', outcome: call.outcome, callId: call.id, notes: call.notes },
    occurredAt: call.updatedAt,
    sourceKey,
  }
  const existing = prior.docs.at(0)
  if (existing !== undefined) {
    await payload.update({
      collection: COLLECTIONS.activity,
      id: existing.id,
      data,
      depth: 0,
      overrideAccess: true,
      req,
    })
    return
  }
  await insertUnique(payload, { collection: COLLECTIONS.activity, field: 'sourceKey', value: sourceKey, data })
}

async function readableAssignees(req: PayloadRequest, call: VoiceCall, actorId: string): Promise<string[]> {
  const repository = createVoiceRepository(req)
  if (call.leadId === null || !(await repository.canReadLead(actorId, call.leadId))) return []
  const assignees: string[] = []
  for (const id of [...new Set(call.assignedUserIds)]) {
    if ((await repository.isActiveUser(id)) && (await repository.canReadLead(id, call.leadId))) assignees.push(id)
  }
  if (assignees.length === 0) assignees.push(actorId)
  return assignees
}

function scheduleTime(call: VoiceCall): number | undefined {
  if (call.outcome === 'booking_arranged') return call.appointmentAt ?? undefined
  if (call.outcome === 'call_back_later') return call.nextActionAt ?? undefined
  return undefined
}

function shouldSchedule(call: VoiceCall): boolean {
  return call.outcome === 'booking_arranged' || call.outcome === 'call_back_later'
}

function schedulePlan(
  call: VoiceCall,
): Readonly<{ leadId: string; outcome: VoiceOutcome; startsAt: number }> | undefined {
  if (call.leadId === null || call.outcome === null || !shouldSchedule(call)) return undefined
  const startsAt = scheduleTime(call)
  return startsAt === undefined ? undefined : { leadId: call.leadId, outcome: call.outcome, startsAt }
}

async function persistSchedule(req: PayloadRequest, call: VoiceCall, actorId: string): Promise<void> {
  const plan = schedulePlan(call)
  if (plan === undefined) {
    await cancelFollowUps(req, call.id)
    return
  }
  const assignees = await readableAssignees(req, call, actorId)
  if (assignees.length === 0) return
  const appointment = plan.outcome === 'booking_arranged'
  const sourceKey = scheduleSourceKey(call.id, plan.outcome)
  const data = {
    kind: appointment ? 'appointment' : 'callback',
    recordType: 'lead',
    recordId: plan.leadId,
    assignees,
    startsAt: plan.startsAt,
    status: 'scheduled',
    title: appointment ? 'Appointment from phone call' : 'Call back lead',
    notes: call.notes,
    sourceKey,
  }
  const opposite = scheduleSourceKey(call.id, appointment ? 'call_back_later' : 'booking_arranged')
  await updateExistingSchedule(req, opposite, { status: 'cancelled' })
  await updateSchedule(req, sourceKey, data)
}

async function cancelFollowUps(req: PayloadRequest, callId: string): Promise<void> {
  for (const outcome of ['call_back_later', 'booking_arranged'] as const) {
    await updateExistingSchedule(req, scheduleSourceKey(callId, outcome), { status: 'cancelled' })
  }
}

async function updateExistingSchedule(
  req: PayloadRequest,
  sourceKey: string,
  data: Readonly<Record<string, unknown>>,
): Promise<void> {
  const found = await req.payload.find({
    collection: COLLECTIONS.scheduleItems,
    where: { sourceKey: { equals: sourceKey } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const existing = found.docs.at(0)
  if (existing !== undefined)
    await req.payload.update({
      collection: COLLECTIONS.scheduleItems,
      id: existing.id,
      data,
      depth: 0,
      overrideAccess: true,
      req,
    })
}

async function updateSchedule(
  req: PayloadRequest,
  sourceKey: string,
  data: Readonly<Record<string, unknown>>,
): Promise<void> {
  const found = await req.payload.find({
    collection: COLLECTIONS.scheduleItems,
    where: { sourceKey: { equals: sourceKey } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const existing = found.docs.at(0)
  if (existing !== undefined) {
    await req.payload.update({
      collection: COLLECTIONS.scheduleItems,
      id: existing.id,
      data,
      depth: 0,
      overrideAccess: true,
      req,
    })
    return
  }
  await insertUnique(req.payload, { collection: COLLECTIONS.scheduleItems, field: 'sourceKey', value: sourceKey, data })
}

/** Persist one readable lead activity and one idempotent callback or booking after a successful wrap-up action. */
export async function persistVoiceWrapup(req: PayloadRequest, actorId: string, call: VoiceCall): Promise<void> {
  if (call.outcome === null) return
  const repository = createVoiceRepository(req)
  if (call.leadId !== null && !(await repository.canReadLead(actorId, call.leadId))) return
  await persistActivity(req, call, actorId)
  await persistSchedule(req, call, actorId)
}
