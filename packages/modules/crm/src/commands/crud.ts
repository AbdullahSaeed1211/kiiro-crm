import { asId, ok } from '@ops/kernel'
import type { CrmDeps } from '../ports/repository'
import type { ContactRecord, CrmDrafts, CrmRecords, OrganizationRecord } from '../ports/records'
import { createContactSchema, createOrganizationSchema, updateContactSchema, updateOrganizationSchema } from '../schema'
import type { UpdateContactInput, UpdateOrganizationInput } from '../schema'
import {
  accessDenied,
  cleanNullable,
  createActivity,
  executeCommand,
  failure,
  id,
  parse,
  type CrmResult,
} from '../domain/helpers'

function defined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>
}

function organizationPatch(value: UpdateOrganizationInput['patch']): Partial<CrmDrafts['organization']> {
  return defined({
    ...value,
    ...(value.website === undefined ? {} : { website: cleanNullable(value.website) }),
    ...(value.phone === undefined ? {} : { phone: cleanNullable(value.phone) }),
    ...(value.email === undefined ? {} : { email: cleanNullable(value.email) }),
    ...(value.ownerId === undefined ? {} : { ownerId: id(value.ownerId) }),
    ...(value.sourceId === undefined ? {} : { sourceId: id(value.sourceId) }),
  }) as unknown as Partial<CrmDrafts['organization']>
}

function contactPatch(value: UpdateContactInput['patch']): Partial<CrmDrafts['contact']> {
  return defined({
    ...value,
    ...(value.lastName === undefined ? {} : { lastName: cleanNullable(value.lastName) }),
    ...(value.email === undefined ? {} : { email: cleanNullable(value.email) }),
    ...(value.phone === undefined ? {} : { phone: cleanNullable(value.phone) }),
    ...(value.organizationId === undefined ? {} : { organizationId: id(value.organizationId) }),
    ...(value.ownerId === undefined ? {} : { ownerId: id(value.ownerId) }),
  }) as unknown as Partial<CrmDrafts['contact']>
}

/** Creates a CRM record and its `record.created` activity in one unit of work. */
export async function createWithActivity<T extends keyof CrmRecords>(
  deps: CrmDeps,
  type: T,
  draft: CrmDrafts[T],
): Promise<CrmResult<CrmRecords[T]>> {
  return deps.uow.run(async () => {
    const created = await deps.repo.create(type, draft)
    await createActivity({ deps, record: { type, id: created.id }, verb: 'record.created' })
    return ok(created)
  })
}

async function createOrganizationWork(deps: CrmDeps, input: unknown): Promise<CrmResult<OrganizationRecord>> {
  const parsed = parse(createOrganizationSchema, input)
  if (!parsed.ok) return parsed
  const denied = accessDenied<OrganizationRecord>({ type: 'organization', deps, record: {}, action: 'create' })
  if (denied !== undefined) return denied
  const value = parsed.value
  const draft = {
    name: value.name,
    website: cleanNullable(value.website),
    phone: cleanNullable(value.phone),
    email: cleanNullable(value.email),
    ownerId: id(value.ownerId),
    sourceId: id(value.sourceId),
    customData: value.customData ?? {},
  } satisfies CrmDrafts['organization']
  return createWithActivity(deps, 'organization', draft)
}

/** Validates and creates an organization. */
export function createOrganization(deps: CrmDeps, input: unknown): Promise<CrmResult<OrganizationRecord>> {
  return executeCommand(deps, input, createOrganizationWork)
}

async function updateOrganizationWork(deps: CrmDeps, input: unknown): Promise<CrmResult<OrganizationRecord>> {
  const parsed = parse(updateOrganizationSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const current = await deps.repo.get('organization', asId(value.id))
  if (current === undefined) return failure('NOT_FOUND', 'organization not found')
  const denied = accessDenied<OrganizationRecord>({ type: 'organization', deps, record: current })
  if (denied !== undefined) return denied
  const patch = organizationPatch(value.patch)
  const saved = await deps.repo.update('organization', current.id, patch, value.expectedUpdatedAt)
  return saved === undefined ? failure('CONFLICT', 'organization was updated by someone else') : ok(saved)
}

/** Validates and conditionally updates an organization. */
export function updateOrganization(deps: CrmDeps, input: unknown): Promise<CrmResult<OrganizationRecord>> {
  return executeCommand(deps, input, updateOrganizationWork)
}

async function createContactWork(deps: CrmDeps, input: unknown): Promise<CrmResult<ContactRecord>> {
  const parsed = parse(createContactSchema, input)
  if (!parsed.ok) return parsed
  const denied = accessDenied<ContactRecord>({ type: 'contact', deps, record: {}, action: 'create' })
  if (denied !== undefined) return denied
  const value = parsed.value
  const draft = {
    firstName: value.firstName,
    lastName: cleanNullable(value.lastName),
    email: cleanNullable(value.email),
    phone: cleanNullable(value.phone),
    organizationId: id(value.organizationId),
    ownerId: id(value.ownerId),
    customData: value.customData ?? {},
  }
  return createWithActivity(deps, 'contact', draft)
}

/** Validates and creates a contact. */
export function createContact(deps: CrmDeps, input: unknown): Promise<CrmResult<ContactRecord>> {
  return executeCommand(deps, input, createContactWork)
}

async function updateContactWork(deps: CrmDeps, input: unknown): Promise<CrmResult<ContactRecord>> {
  const parsed = parse(updateContactSchema, input)
  if (!parsed.ok) return parsed
  const value = parsed.value
  const current = await deps.repo.get('contact', asId(value.id))
  if (current === undefined) return failure('NOT_FOUND', 'contact not found')
  const denied = accessDenied<ContactRecord>({ type: 'contact', deps, record: current })
  if (denied !== undefined) return denied
  const patch = contactPatch(value.patch)
  const saved = await deps.repo.update('contact', current.id, patch, value.expectedUpdatedAt)
  return saved === undefined ? failure('CONFLICT', 'contact was updated by someone else') : ok(saved)
}

/** Validates and conditionally updates a contact. */
export function updateContact(deps: CrmDeps, input: unknown): Promise<CrmResult<ContactRecord>> {
  return executeCommand(deps, input, updateContactWork)
}
