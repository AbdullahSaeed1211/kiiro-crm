import { domainError, err, ok } from '@ops/kernel'
import type { IntakeForm, IntakeStore, IntakeSubmission } from '@ops/module-intake'
import { formFieldsSchema } from '@ops/module-intake'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { fieldOf, idOf, idsOf, numberOf, textOf, type Doc } from './documents'
import { insertUnique } from './unique-insert'

const RECOVERY_VERSION = 1
const RECOVERY_MARKER = '__opsIntakeStorage'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function storedPayload(doc: Doc): { readonly payload: Record<string, unknown>; readonly recoverable: boolean } {
  const value: unknown = fieldOf(doc, 'payload')
  if (!isObject(value)) return { payload: {}, recoverable: false }
  const marker: unknown = value[RECOVERY_MARKER]
  const version = isObject(marker) ? marker['version'] : undefined
  const wrapped = version === RECOVERY_VERSION
  const payload: unknown = wrapped ? value['value'] : value
  return isObject(payload) ? { payload, recoverable: wrapped } : { payload: {}, recoverable: false }
}

function markRecoverablePayload(payload: Readonly<Record<string, unknown>>): Record<string, unknown> {
  return { [RECOVERY_MARKER]: { version: RECOVERY_VERSION }, value: payload }
}

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
// eslint-disable-next-line complexity -- decoder validates every field before exposing the domain record.
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
  const questions = formFieldsSchema.safeParse(fieldOf(doc, 'formFields') ?? [])
  if (!questions.success) return undefined
  return {
    id,
    key,
    name,
    active: fieldOf(doc, 'active') === true,
    targetRecordType: 'lead',
    fieldMap: stringMap(fieldOf(doc, 'fieldMap')),
    formFields: questions.data,
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

// eslint-disable-next-line complexity -- complete persisted record decoder.
function toSubmission(doc: Doc): IntakeSubmission | undefined {
  const id = idOf(fieldOf(doc, 'id'))
  const formId = relationId(fieldOf(doc, 'form'))
  const channel = textOf(doc, 'channel') as IntakeSubmission['channel'] | undefined
  const receivedAt = numberOf(doc, 'receivedAt')
  const status = textOf(doc, 'status') as IntakeSubmission['status'] | undefined
  if (id === undefined || formId === undefined || channel === undefined || receivedAt === null || status === undefined)
    return undefined
  const recordId = textOf(doc, 'recordId')
  const decodedPayload = storedPayload(doc)
  return {
    id,
    formId,
    channel,
    receivedAt,
    origin: textOf(doc, 'origin') ?? '',
    ipHash: textOf(doc, 'ipHash') ?? '',
    userAgent: textOf(doc, 'userAgent') ?? '',
    payload: decodedPayload.payload,
    dedupeKey: textOf(doc, 'dedupeKey') ?? '',
    status,
    ...(decodedPayload.recoverable ? { recoverable: true } : {}),
    ...(recordId === undefined ? {} : { recordRef: { type: 'lead', id: recordId } }),
  }
}

/** Payload-backed intake command store with unique-key dedupe and system-only writes. */
export function createIntakeSubmissionStore(
  payload: Payload,
): Pick<IntakeStore, 'findByDedupeKey' | 'insertSubmission' | 'markDuplicate'> {
  return {
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
        data: { ...submission, payload: markRecoverablePayload(submission.payload), form: submission.formId },
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
  }
}
