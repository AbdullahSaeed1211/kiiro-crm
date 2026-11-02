import { isManagerUp, type Actor } from '@ops/platform'
import type { Access, FieldAccess, Where } from 'payload'
import { resolveActor } from '../../access/actor'

type Rule = (actor: Actor) => boolean | Where

export function activeUser(req: Parameters<Access>[0]['req']): Promise<Actor | undefined> {
  return resolveActor(req)
}

export function allowPeople(rule: Rule): Access {
  return async ({ req }) => {
    const actor = await activeUser(req)
    return actor?.active === true ? rule(actor) : false
  }
}

export const anyActive = allowPeople(() => true)
export const managerUp = allowPeople(isManagerUp)
export const ownerOnly = allowPeople((actor) => actor.role === 'owner')
export const membersManagerUp = allowPeople((actor): boolean | Where => {
  if (actor.role === 'owner') return { id: { exists: true } }
  if (actor.role === 'manager') return { role: { equals: 'staff' } }
  return { id: { equals: '__no_member_access__' } }
})

export const selfOnly = (field = 'id'): Access => allowPeople((actor) => ({ [field]: { equals: actor.id } }))

const STAFF_VISIBLE_FIELDS = new Set(['name', 'email', 'avatar', 'role'])
export const userFieldRead =
  (field: string): FieldAccess =>
  async ({ req, id }) => {
    const actor = await resolveActor(req)
    return (
      actor?.active === true &&
      (actor.role !== 'staff' ||
        STAFF_VISIBLE_FIELDS.has(field) ||
        (field === 'workProfile' && String(actor.id) === String(id)))
    )
  }

const userUpdateAccess: Access = async ({ req }): Promise<boolean | Where> => {
  // Payload's forgotPassword operation updates reset token fields before it sends the email.
  // This context is supplied only by our server-side auth route; the beforeChange hook narrows the fields.
  if ((req.context as Record<string, unknown> | undefined)?.['authOperation'] === 'passwordReset') return true
  const actor = await activeUser(req)
  if (actor?.active !== true) return false
  if (actor.role === 'owner') return { id: { exists: true } }
  if (actor.role === 'manager') return { or: [{ id: { equals: actor.id } }, { role: { equals: 'staff' } }] }
  return { id: { equals: actor.id } }
}

export const peopleAccess = {
  users: {
    read: allowPeople((actor) => isManagerUp(actor) || { active: { equals: true } }),
    create: () => false,
    update: userUpdateAccess,
    delete: () => false,
  },
  groups: { read: anyActive, create: managerUp, update: managerUp, delete: managerUp },
  invitations: {
    read: managerUp,
    create: membersManagerUp,
    update: managerUp,
    delete: () => false,
  },
  notificationPrefs: {
    read: selfOnly('user'),
    create: selfOnly('user'),
    update: selfOnly('user'),
    delete: () => false,
  },
} as const
