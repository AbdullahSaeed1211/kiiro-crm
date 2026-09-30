import { domainError, err, ok } from '@ops/kernel'
import type { IntakeForm, IntakeStore, IntakeSubmission } from '@ops/module-intake'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, idsOf, numberOf, textOf, type Doc } from './documents'
import { insertUnique } from './unique-insert'
import { toWorkflow } from './workflow-mapping'

interface LoosePayload {
  create(options: Readonly<Record<string, unknown>>): Promise<Doc>
  update(options: Readonly<Record<string, unknown>>): Promise<Doc>
}

const loose = (payload: object): LoosePayload => payload as LoosePayload

function relationId(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return typeof value === 'object' && value !== null ? relationId(Reflect.get(value, 'id')) : undefined
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function stringMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

/** Maps one Payload intake form document into the domain contract. */
// The decoder validates every required and optional persistence field in one place.
// eslint-disable-next-line complexity -- relation normalization accepts Payload's scalar and populated shapes.
export function toIntakeForm(doc: Doc): IntakeForm | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const key = textOf(doc, 'key')
  const name = textOf(doc, 'name')
  if (id === undefined || key === undefined || name === undefined) return undefined
  const optional = (keyName: string): string | undefined => textOf(doc, keyName) ?? undefined
  const defaultOwnerId = relationId(fieldOf(doc, 'defaultOwner'))
  const defaultSourceId = relationId(fieldOf(doc, 'defaultSource'))
  const redirectUrl = optional('redirectUrl')
  const emailAlias = optional('emailAlias')
  return {
    id,
    key,
    name,
    active: fieldOf(doc, 'active') === true,
    targetRecordType: 'lead',
    fieldMap: stringMap(fieldOf(doc, 'fieldMap')),
    allowedOrigins: stringList(fieldOf(doc, 'allowedOrigins')),
    requireTurnstile: fieldOf(doc, 'requireTurnstile') === true,
    serverKeyHashes: stringList(fieldOf(doc, 'serverKeyHashes')),
    ...(defaultOwnerId === undefined ? {} : { defaultOwnerId }),
    defaultAssigneeIds: idsOf(fieldOf(doc, 'defaultAssignees')).map(String),
    ...(defaultSourceId === undefined ? {} : { defaultSourceId }),
    notifyUserIds: idsOf(fieldOf(doc, 'notifyUsers')).map(String),
    notifyGroupIds: idsOf(fieldOf(doc, 'notifyGroups')).map(String),
    successMessage: textOf(doc, 'successMessage') ?? 'Thanks. We will be in touch.',
    ...(redirectUrl === undefined ? {} : { redirectUrl }),
    ...(emailAlias === undefined ? {} : { emailAlias }),
  }
}

/** Loads one active intake form by public key or email alias. */
export async function findIntakeForm(payload: Payload, field: 'key' | 'emailAlias', value: string) {
  const page = await payload.find({
    collection: COLLECTIONS.intakeForms,
    where: { and: [{ [field]: { equals: value } }, { active: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return page.docs[0] === undefined ? undefined : toIntakeForm(page.docs[0])
}

// The decoder validates the persisted discriminants before exposing the domain object.
// eslint-disable-next-line complexity -- this decoder validates the complete persisted submission shape.
function toSubmission(doc: Doc): IntakeSubmission | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const formId = relationId(fieldOf(doc, 'form'))
  const channel = textOf(doc, 'channel') as IntakeSubmission['channel'] | undefined
  const receivedAt = numberOf(doc, 'receivedAt')
  const status = textOf(doc, 'status') as IntakeSubmission['status'] | undefined
  if (id === undefined || formId === undefined || channel === undefined || receivedAt === null || status === undefined)
    return undefined
  const recordId = textOf(doc, 'recordId')
  return {
    id,
    formId,
    channel,
    receivedAt,
    origin: textOf(doc, 'origin') ?? '',
    ipHash: textOf(doc, 'ipHash') ?? '',
    userAgent: textOf(doc, 'userAgent') ?? '',
    payload: typeof fieldOf(doc, 'payload') === 'object' ? (fieldOf(doc, 'payload') as Record<string, unknown>) : {},
    dedupeKey: textOf(doc, 'dedupeKey') ?? '',
    status,
    ...(recordId === undefined ? {} : { recordRef: { type: 'lead', id: recordId } }),
  }
}

/** Payload-backed intake command store with unique-key dedupe and system-only writes. */
const submissionStore = (
  payload: Payload,
): Pick<IntakeStore, 'findByDedupeKey' | 'insertSubmission' | 'markDuplicate'> => ({
  findByDedupeKey: async (dedupeKey) => {
    const page = await payload.find({
      collection: COLLECTIONS.intakeSubmissions,
      where: { dedupeKey: { equals: dedupeKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    return page.docs[0] === undefined ? undefined : toSubmission(page.docs[0])
  },
  insertSubmission: async (submission) => {
    const created = await insertUnique(payload, {
      collection: COLLECTIONS.intakeSubmissions,
      field: 'dedupeKey',
      value: submission.dedupeKey,
      data: { ...submission, form: submission.formId },
    })
    if (created === 'duplicate') return ok({ id: '', ...submission, status: 'duplicate' })
    const page = await payload.find({
      collection: COLLECTIONS.intakeSubmissions,
      where: { dedupeKey: { equals: submission.dedupeKey } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const stored = page.docs[0] === undefined ? undefined : toSubmission(page.docs[0])
    return stored === undefined ? err(domainError('INTERNAL', 'submission could not be loaded')) : ok(stored)
  },
  markDuplicate: () => Promise.resolve(),
})

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

async function createLead(payload: Payload, data: Readonly<Record<string, unknown>>) {
  const doc = await loose(payload).create({
    collection: COLLECTIONS.leads,
    data: { ...data, ...(await startingStage(payload)) },
    overrideAccess: true,
    depth: 0,
  })
  const id = idOf(fieldOf(doc, 'id'))
  if (id === undefined) throw new Error('lead create returned no id')
  return { id }
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
  for (const user of userIds) {
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

/** Payload-backed intake command store with unique-key dedupe and system-only writes. */
export function createIntakeStore(payload: Payload): IntakeStore {
  return {
    ...submissionStore(payload),
    createLead: (data) => createLead(payload, data),
    addComment: (input) => addOwnerNote(payload, input),
    notify: (input) => notifyUsers(payload, input),
  }
}
