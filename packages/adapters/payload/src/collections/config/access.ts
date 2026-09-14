import { isManagerUp, type Actor } from '@ops/platform'
import type { Access, Where } from 'payload'
import { resolveActor } from '../../access/actor'

type Rule = (actor: Actor) => boolean | Where

const allow =
  (rule: Rule): Access =>
  async ({ req }) => {
    const actor = await resolveActor(req)
    return actor?.active === true ? rule(actor) : false
  }

export const configAccess = {
  managerUp: allow(isManagerUp),
  ownerOnly: allow((actor) => actor.role === 'owner'),
  activeRead: allow(() => true),
  personalView: allow((actor) => ({ owner: { equals: actor.id } })),
} as const

export const sharedViewAccess = {
  read: allow(() => true),
  create: allow((actor) => isManagerUp(actor)),
  update: allow(isManagerUp),
  delete: allow(isManagerUp),
} as const
