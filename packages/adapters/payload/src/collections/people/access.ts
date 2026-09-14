import { isManagerUp, type Actor } from '@ops/platform'
import type { Access, Where } from 'payload'
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

export const peopleAccess = {
  users: {
    read: allowPeople((actor) => isManagerUp(actor) || { active: { equals: true } }),
    create: () => false,
    update: allowPeople((actor): boolean | Where => {
      if (actor.role === 'owner') return { id: { exists: true } }
      if (actor.role === 'manager') return { or: [{ id: { equals: actor.id } }, { role: { equals: 'staff' } }] }
      return { id: { equals: actor.id } }
    }),
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
    create: () => false,
    update: selfOnly('user'),
    delete: () => false,
  },
} as const
