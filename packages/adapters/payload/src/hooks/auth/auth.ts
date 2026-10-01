/* eslint-disable complexity, max-statements, sonarjs/cognitive-complexity -- this hook is the single Payload login policy boundary. */
import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeLoginHook,
  type CollectionAfterErrorHook,
  type CollectionAfterOperationHook,
  type PayloadRequest,
  type TypeWithID,
} from 'payload'
import { resolveActor } from '../../access/actor'

interface UserRecord extends TypeWithID {
  readonly role?: unknown
  readonly active?: unknown
  readonly email?: unknown
  readonly password?: unknown
  readonly totpEnabled?: unknown
}

const SELF_UPDATE_FIELDS = new Set(['name', 'avatar', 'password'])
const STAFF_MANAGEMENT_FIELDS = new Set(['name', 'avatar', 'password', 'active', 'groups', 'reportsTo'])
const ownerLocks = new WeakMap<object, Promise<void>>()
const ownerReleases = new WeakMap<object, () => void>()

/** Credential-like fields (second step, calendar feed address) that only server code writes, under the `privateFields` context. */
const PRIVATE_USER_FIELDS = new Set([
  'totpSecret',
  'totpEnabled',
  'totpRecovery',
  'totpFailures',
  'totpLockedUntil',
  'calendarToken',
  'apiTokens',
])

/**
 * The sign-in code and the Profile page write these fields through the Local API with this context, which a
 * request cannot set. `data` holds the whole document on update, so every other field is put back to what it was.
 */
function onlyPrivateFieldChanges(data: Partial<UserRecord>, originalDoc: UserRecord | undefined): Partial<UserRecord> {
  const original: Record<string, unknown> = { ...originalDoc }
  const kept = Object.entries(data).map(([key, value]) => [
    key,
    PRIVATE_USER_FIELDS.has(key) ? value : (original[key] ?? value),
  ])
  return Object.fromEntries(kept) as Partial<UserRecord>
}

/** The message sign-in answers with when a password is right but the account also needs an authenticator code. */
export const TWO_FACTOR_REQUIRED = 'Two-step code required.'

function trustedCreate(req: PayloadRequest): boolean {
  const context = req.context as Record<string, unknown> | undefined
  const operation = context?.['authOperation']
  return operation === 'invitation' || operation === 'provisioning'
}

export function passwordPolicy(password: unknown, email: unknown): true | string {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128)
    return 'Password must be 12 to 128 characters.'
  if (typeof email === 'string' && password.toLowerCase() === email.toLowerCase())
    return 'Password must not equal the email address.'
  return true
}

function valueOf(record: UserRecord | undefined, key: keyof UserRecord): unknown {
  return record?.[key]
}

/**
 * Payload login guard for deactivated users and for accounts with two-step sign-in. It runs after the password is
 * verified, so every login path, including Payload's own routes, needs the code; only the product's sign-in route sets
 * `twoFactorVerified` after it has checked one.
 */
export const blockInactiveUser: CollectionBeforeLoginHook<UserRecord> = ({ user, context }) => {
  if (user.active !== true) throw new APIError('This account has been deactivated.', 403, null, true)
  const sealed = user.totpEnabled === true
  if (sealed && (context as Record<string, unknown>)['twoFactorVerified'] !== true)
    throw new APIError(TWO_FACTOR_REQUIRED, 401, null, true)
}

function isOwner(record: UserRecord | undefined): boolean {
  return valueOf(record, 'role') === 'owner' && valueOf(record, 'active') === true
}

function isOwnerChange(data: Partial<UserRecord>, originalDoc: UserRecord | undefined): boolean {
  const nextRole = data.role ?? originalDoc?.role
  const nextActive = data.active ?? originalDoc?.active
  return nextRole !== 'owner' || nextActive !== true
}

async function assertAnotherOwner(req: PayloadRequest): Promise<void> {
  const owners = await req.payload.count({
    collection: 'users',
    where: { role: { equals: 'owner' }, active: { equals: true } },
    overrideAccess: true,
    req,
  })
  if (owners.totalDocs <= 1)
    throw new APIError('The last active owner cannot be demoted or deactivated.', 409, null, true)
}

async function acquireOwnerLock(req: PayloadRequest): Promise<void> {
  const previous = ownerLocks.get(req.payload) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>((resolve) => {
    release = resolve
  })
  ownerLocks.set(
    req.payload,
    previous.then(() => current),
  )
  await previous
  ownerReleases.set(req, release)
}

function releaseOwnerLock({ req }: { req: PayloadRequest }): void {
  ownerReleases.get(req)?.()
  ownerReleases.delete(req)
}

const releaseOwnerLockAfterOperation: CollectionAfterOperationHook = ({ req, result }) => {
  releaseOwnerLock({ req })
  return result
}

const releaseOwnerLockAfterError: CollectionAfterErrorHook = ({ req }) => {
  releaseOwnerLock({ req })
}

/** Prevents an update from removing the final active owner of the tenant. */
export const protectLastActiveOwner: CollectionBeforeChangeHook<UserRecord> = async ({ data, originalDoc, req }) => {
  if (data.password !== undefined) {
    const valid = passwordPolicy(data.password, data.email ?? originalDoc?.email)
    if (valid !== true) throw new APIError(valid, 400, null, true)
  }
  const wasActiveOwner = isOwner(originalDoc)
  if (!wasActiveOwner || !isOwnerChange(data, originalDoc)) return data
  await acquireOwnerLock(req)
  try {
    await assertAnotherOwner(req)
  } catch (error) {
    releaseOwnerLock({ req })
    throw error
  }
  return data
}

/** Enforces the users matrix at the document boundary, including Local API calls with overrideAccess. */
export const enforceUserMutation: CollectionBeforeChangeHook<UserRecord> = async ({
  data,
  originalDoc,
  req,
  operation,
  context,
}) => {
  const email = data.email ?? originalDoc?.email
  if (data.password !== undefined) {
    const valid = passwordPolicy(data.password, email)
    if (valid !== true) throw new APIError(valid, 400, null, true)
  }
  if (operation === 'create') {
    if (!trustedCreate(req))
      throw new APIError('Users can only be created by an invitation or provisioning flow.', 403, null, true)
    return data
  }
  if (trustedCreate(req)) return data
  if ((context as Record<string, unknown> | undefined)?.['authOperation'] === 'privateFields')
    return onlyPrivateFieldChanges(data, originalDoc)
  const actor = await resolveActor(req)
  if (actor?.active !== true) throw new APIError('You do not have permission to update this user.', 403, null, true)
  if (actor.role === 'owner') return data
  const isSelf = String(originalDoc?.id) === String(actor.id)
  const allowed = new Set<string>()
  if (isSelf) SELF_UPDATE_FIELDS.forEach((field) => allowed.add(field))
  if (actor.role === 'manager' && originalDoc?.role === 'staff')
    STAFF_MANAGEMENT_FIELDS.forEach((field) => allowed.add(field))
  if (Object.keys(data).some((key) => !allowed.has(key)))
    throw new APIError('This user update is outside your role permissions.', 403, null, true)
  return data
}

export const authHooks = {
  beforeLogin: [blockInactiveUser],
  beforeChange: [protectLastActiveOwner, enforceUserMutation],
  afterOperation: [releaseOwnerLockAfterOperation],
  afterError: [releaseOwnerLockAfterError],
} as const
