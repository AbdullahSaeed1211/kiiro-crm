import { isManagerUp, type Actor } from '@ops/platform'
import type { Access, AccessArgs, Where } from 'payload'
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

interface SavedViewData {
  readonly owner?: unknown
}
function ownerIdOf(value: unknown): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (typeof value === 'object' && value !== null && 'id' in value) return ownerIdOf(value.id)
  return undefined
}
function sharedViewScope(actor: Actor): Where {
  return { or: [{ owner: { equals: null } }, { owner: { equals: actor.id } }] }
}
const createSharedView: Access<SavedViewData> = async ({ req, data }: AccessArgs<SavedViewData>) => {
  const actor = await resolveActor(req)
  if (actor?.active !== true) return false
  if (data?.owner === null) return isManagerUp(actor)
  const owner = ownerIdOf(data?.owner)
  return owner === undefined || owner === String(actor.id)
}

export const sharedViewAccess = {
  read: allow(sharedViewScope),
  create: createSharedView,
  update: allow(sharedViewScope),
  delete: allow(sharedViewScope),
} as const
