import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeLoginHook,
  type PayloadRequest,
  type TypeWithID,
} from 'payload'

interface UserRecord extends TypeWithID {
  readonly role?: unknown
  readonly active?: unknown
  readonly email?: unknown
  readonly password?: unknown
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

/** Payload login guard for deactivated users. The check runs after credentials are verified. */
export const blockInactiveUser: CollectionBeforeLoginHook<UserRecord> = ({ user }) => {
  if (user.active !== true) throw new APIError('This account has been deactivated.', 403, null, true)
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

/** Prevents an update from removing the final active owner of the tenant. */
export const protectLastActiveOwner: CollectionBeforeChangeHook<UserRecord> = async ({ data, originalDoc, req }) => {
  if (data.password !== undefined) {
    const valid = passwordPolicy(data.password, data.email ?? originalDoc?.email)
    if (valid !== true) throw new APIError(valid, 400, null, true)
  }
  const wasActiveOwner = isOwner(originalDoc)
  if (!wasActiveOwner || !isOwnerChange(data, originalDoc)) return data
  await assertAnotherOwner(req)
  return data
}

export const authHooks = {
  beforeLogin: [blockInactiveUser],
  beforeChange: [protectLastActiveOwner],
} as const
