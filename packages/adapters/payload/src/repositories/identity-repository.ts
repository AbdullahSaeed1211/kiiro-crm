import { asId, domainError, err, ok, type DomainError, type ErrorCode, type Id, type Result } from '@ops/kernel'
import type { IdentityRepository, InvitationRecord, MemberAccess } from '@ops/module-identity'
import type { Role } from '@ops/platform'
import type { PayloadRequest, Where } from 'payload'
import { PEOPLE_COLLECTIONS } from '../collections/people/values'

const PAYLOAD_FAILURES: Readonly<Record<string, ErrorCode>> = {
  ValidationError: 'VALIDATION',
  Forbidden: 'FORBIDDEN',
  NotFound: 'NOT_FOUND',
}

/** Payload's user-facing rejections, including the last-active-owner hook's 409; anything else is unexpected. */
function knownFailure(error: unknown): DomainError | undefined {
  if (!(error instanceof Error)) return undefined
  const code = PAYLOAD_FAILURES[error.name]
  if (code !== undefined) return domainError(code, error.message)
  if (error.name === 'APIError' && Reflect.get(error, 'status') === 409) return domainError('CONFLICT', error.message)
  return undefined
}

async function write(run: () => Promise<unknown>): Promise<Result<undefined>> {
  try {
    await run()
    return ok(undefined)
  } catch (error) {
    const failure = knownFailure(error)
    if (failure === undefined) throw error
    return err(failure)
  }
}

const isRole = (value: unknown): value is Role => value === 'owner' || value === 'manager' || value === 'staff'

function toInvitation(doc: Record<string, unknown>): InvitationRecord | undefined {
  const { id, email, role, status } = doc
  if (typeof id !== 'string' || typeof email !== 'string' || !isRole(role) || typeof status !== 'string')
    return undefined
  return { id: asId(id), email, role, status: status as InvitationRecord['status'] }
}

function reads(req: PayloadRequest) {
  const findOne = async (collection: 'users' | 'invitations', where: Where, overrideAccess: boolean) => {
    const found = await req.payload.find({ collection, where, limit: 1, depth: 0, overrideAccess, req })
    return found.docs.at(0) as Record<string, unknown> | undefined
  }
  return {
    memberExistsWithEmail: async (email: string) =>
      (await findOne(PEOPLE_COLLECTIONS.users, { email: { equals: email } }, true)) !== undefined,
    pendingInvitationExists: async (email: string) =>
      (await findOne(
        PEOPLE_COLLECTIONS.invitations,
        { and: [{ email: { equals: email } }, { status: { equals: 'pending' } }] },
        true,
      )) !== undefined,
    getInvitation: async (id: Id) => {
      const doc = await findOne(PEOPLE_COLLECTIONS.invitations, { id: { equals: id } }, false)
      return doc === undefined ? undefined : toInvitation(doc)
    },
    getMemberRole: async (id: Id) => {
      const role = (await findOne(PEOPLE_COLLECTIONS.users, { id: { equals: id } }, false))?.['role']
      return isRole(role) ? role : undefined
    },
  }
}

function memberWrites(req: PayloadRequest) {
  const { payload } = req
  return {
    revokeInvitation: (id: Id) =>
      write(() =>
        payload.update({
          collection: PEOPLE_COLLECTIONS.invitations,
          id,
          data: { status: 'revoked' },
          overrideAccess: false,
          req,
        }),
      ),
    updateMember: (id: Id, access: MemberAccess) =>
      write(() =>
        payload.update({
          collection: PEOPLE_COLLECTIONS.users,
          id,
          data: { role: access.role, active: access.active, groups: [...access.groups], reportsTo: access.reportsTo },
          overrideAccess: false,
          req,
        }),
      ),
    saveGroup: ({ id, name }: Readonly<{ id?: Id; name: string }>) =>
      write(() =>
        id === undefined
          ? payload.create({ collection: PEOPLE_COLLECTIONS.groups, data: { name }, req })
          : payload.update({ collection: PEOPLE_COLLECTIONS.groups, id, data: { name }, req }),
      ),
  }
}

/** Membership persistence on Payload. Invitation creation bypasses access so staff tokens never leak; other writes run as the actor. */
export function createIdentityRepository(req: PayloadRequest): IdentityRepository {
  const { payload } = req
  return {
    ...reads(req),
    ...memberWrites(req),
    createInvitation: (draft) =>
      write(() =>
        payload.create({
          collection: PEOPLE_COLLECTIONS.invitations,
          data: { ...draft, status: 'pending' },
          overrideAccess: true,
          req,
        }),
      ),
    deleteGroup: (id) => write(() => payload.delete({ collection: PEOPLE_COLLECTIONS.groups, id, req })),
  }
}
