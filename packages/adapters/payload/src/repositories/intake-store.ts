import type { IntakeStore } from '@ops/module-intake'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, idsOf, type Doc } from './documents'
import { insertUnique } from './unique-insert'
import { toWorkflow } from './workflow-mapping'
import { createIntakeSubmissionStore } from './intake-submission-store'
import { findLeadByContact, findLeadBySubmission } from './intake-lead-matching'

export { findIntakeForm, toIntakeForm } from './intake-submission-store'

interface LoosePayload {
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
  update(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

const loose = (payload: object): LoosePayload => payload as LoosePayload

/**
 * Where a new lead starts: the first lead workflow's default stage. A lead saved without a stage is never shown on
 * the lead list or board, so every lead created here must carry one.
 */
async function startingStage(payload: Payload) {
  const found = await payload.find({
    collection: COLLECTIONS.workflows,
    where: { recordType: { equals: 'lead' } },
    sort: 'createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const doc = found.docs.at(0)
  const workflow = doc === undefined ? undefined : toWorkflow(doc)
  return workflow === undefined
    ? {}
    : { workflow: workflow.id, stageId: workflow.defaultStageId, stageEnteredAt: Date.now() }
}

async function createLead(
  payload: Payload,
  data: Readonly<Record<string, unknown>>,
  schedule?: Parameters<IntakeStore['createLead']>[1],
) {
  const submissionId = schedule?.submissionId
  const ensured = await ensureLead(payload, data, submissionId)
  const doc = ensured.lead
  const id = idOf(fieldOf(doc, 'id'))
  if (id === undefined) throw new Error('lead create returned no id')
  if (submissionId !== undefined && !ensured.submissionLinked) await linkSubmission(payload, submissionId, id)
  await ensureIntakeSchedule({ payload, lead: doc, recordId: id, schedule })
  return { id }
}

async function linkSubmission(payload: Payload, submissionId: string, recordId: string): Promise<void> {
  await loose(payload).update({
    collection: COLLECTIONS.intakeSubmissions,
    id: submissionId,
    data: { recordId },
    overrideAccess: true,
    depth: 0,
  })
}

async function ensureIntakeSchedule(input: {
  readonly payload: Payload
  readonly lead: Doc
  readonly recordId: string
  readonly schedule?: Parameters<IntakeStore['createLead']>[1]
}): Promise<void> {
  const { payload, lead, recordId, schedule } = input
  for (const item of schedule?.items ?? []) {
    const sourceKey = `intake:${schedule?.submissionId ?? ''}:${item.sourceField}:${item.kind}`
    const assignees = idsOf(fieldOf(lead, 'assignees')).map(String)
    const owner = idOf(fieldOf(lead, 'owner'))
    const routedAssignees = [...new Set([...assignees, ...(owner === undefined ? [] : [owner])])]
    const data = {
      kind: item.kind,
      recordType: 'lead',
      recordId,
      assignees: routedAssignees,
      startsAt: item.startsAt,
      status: 'scheduled',
      title: null,
      notes: null,
      sourceKey,
    }
    const saved = await ensureScheduleItem(payload, sourceKey, data)
    if (idOf(fieldOf(saved, 'id')) === undefined) throw new Error('schedule item save returned no id')
  }
}

async function ensureLead(
  payload: Payload,
  data: Readonly<Record<string, unknown>>,
  submissionId?: string,
): Promise<{ readonly lead: Doc; readonly submissionLinked: boolean }> {
  if (submissionId !== undefined) {
    const linkedLead = await findLeadBySubmission(payload, submissionId)
    if (linkedLead !== undefined) return { lead: linkedLead, submissionLinked: true }
  }
  const matchingLead = await findLeadByContact(payload, data)
  if (matchingLead !== undefined) return { lead: matchingLead, submissionLinked: false }
  if (submissionId === undefined) {
    return {
      lead: await loose(payload).create({
        collection: COLLECTIONS.leads,
        data: { ...data, ...(await startingStage(payload)) },
        overrideAccess: true,
        depth: 0,
      }),
      submissionLinked: false,
    }
  }
  await insertUnique(payload, {
    collection: COLLECTIONS.leads,
    field: 'intakeSubmissionId',
    value: submissionId,
    data: { ...data, intakeSubmissionId: submissionId, ...(await startingStage(payload)) },
  })
  const saved = await findLeadBySubmission(payload, submissionId)
  if (saved === undefined) throw new Error('lead create returned no document')
  return { lead: saved, submissionLinked: false }
}

async function ensureScheduleItem(
  payload: Payload,
  sourceKey: string,
  data: Readonly<Record<string, unknown>>,
): Promise<Doc> {
  await insertUnique(payload, {
    collection: COLLECTIONS.scheduleItems,
    field: 'sourceKey',
    value: sourceKey,
    data,
  })
  const page = await payload.find({
    collection: COLLECTIONS.scheduleItems,
    where: { sourceKey: { equals: sourceKey } },
    limit: 1,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  const saved = page.docs.at(0)
  if (saved === undefined) throw new Error('schedule item save returned no document')
  return saved
}

/** Writes a visitor's message as a note authored by the workspace owner, so the comment rules see an active author. */
async function addOwnerNote(payload: Payload, input: Parameters<IntakeStore['addComment']>[0]): Promise<void> {
  const { record, body } = input
  const owner = await payload.find({
    collection: COLLECTIONS.users,
    where: { role: { equals: 'owner' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const ownerDoc = owner.docs.at(0)
  const author = ownerDoc === undefined ? undefined : idOf(fieldOf(ownerDoc, 'id'))
  if (author === undefined) return
  await loose(payload).create({
    collection: 'comments',
    data: { ...record, recordType: record.type, recordId: record.id, author, body },
    user: ownerDoc,
    overrideAccess: true,
    depth: 0,
  })
}

async function notifyUsers(payload: Payload, input: Parameters<IntakeStore['notify']>[0]): Promise<void> {
  const { userIds, record, title } = input
  const recipients = new Set([...userIds, ...(await activeGroupMembers(payload, input.groupIds))])
  for (const user of recipients) {
    const dedupeKey = `${record.type}:${record.id}:intake_received:${user}`
    await insertUnique(payload, {
      collection: COLLECTIONS.notifications,
      field: 'dedupeKey',
      value: dedupeKey,
      data: {
        user,
        type: 'intake_received',
        recordType: record.type,
        recordId: record.id,
        data: { title },
        dedupeKey,
      },
    })
  }
}

async function activeGroupMembers(payload: Payload, selectedGroupIds: readonly string[]): Promise<string[]> {
  const groupIds = [...new Set(selectedGroupIds)]
  if (groupIds.length === 0) return []
  const page = await payload.find({
    collection: COLLECTIONS.users,
    where: {
      and: [{ or: groupIds.map((group) => ({ groups: { contains: group } })) }, { active: { equals: true } }],
    },
    limit: 0,
    pagination: false,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs.flatMap((member) => {
    const id = idOf(fieldOf(member, 'id'))
    return id === undefined ? [] : [id]
  })
}

/** Payload-backed intake command store with unique-key dedupe and system-only writes. */
export function createIntakeStore(payload: Payload): IntakeStore {
  return {
    ...createIntakeSubmissionStore(payload),
    createLead: (data, schedule) => createLead(payload, data, schedule),
    addComment: (input) => addOwnerNote(payload, input),
    notify: (input) => notifyUsers(payload, input),
  }
}
