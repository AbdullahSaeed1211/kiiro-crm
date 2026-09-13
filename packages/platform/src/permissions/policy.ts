import type { Id } from '@ops/kernel'
import type { AccessResource, Action, Actor, Can } from '../contracts/access'

type Rule = (actor: Actor, resource: AccessResource) => boolean

/** True for owners and managers. */
export function isManagerUp(actor: Actor): boolean {
  return actor.role === 'owner' || actor.role === 'manager'
}

function ownsOrManagesOwner(actor: Actor, ownerId: Id | undefined): boolean {
  return ownerId !== undefined && (ownerId === actor.id || actor.reportIds.includes(ownerId))
}

/** True when the actor or a transitive report owns `resource`, the actor is assigned, or it belongs to one of the actor's groups. */
export function inScope(actor: Actor, resource: AccessResource): boolean {
  const assigned = (resource.assigneeIds ?? []).includes(actor.id)
  const inGroup = resource.groupId !== undefined && actor.groupIds.includes(resource.groupId)
  return ownsOrManagesOwner(actor, resource.ownerId) || assigned || inGroup
}

const scoped: Rule = (actor, resource) => isManagerUp(actor) || inScope(actor, resource)
const managerUp: Rule = (actor) => isManagerUp(actor)

const RULES: Readonly<Record<Action, Rule>> = {
  read: scoped,
  create: () => true,
  update: scoped,
  delete: managerUp,
  assign: scoped,
  convert: scoped,
  manage_settings: (actor) => actor.role === 'owner',
  manage_members: (actor, resource) =>
    actor.role === 'owner' || (actor.role === 'manager' && resource.role === 'staff'),
  manage_workflows: managerUp,
  manage_intake: managerUp,
  admin_panel: managerUp,
}

/** Pure permission check implementing the capability table of spec §9.10; inactive actors are denied everything. */
export const can: Can = (actor, action, resource) => actor.active && RULES[action](actor, resource)
