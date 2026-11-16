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

function directSalesScope(actor: Actor, resource: AccessResource): boolean {
  return (
    resource.ownerId === actor.id ||
    resource.createdById === actor.id ||
    (resource.assigneeIds ?? []).includes(actor.id)
  )
}

/** True when the actor or a transitive report owns `resource`, the actor is assigned, or it belongs to one of the actor's groups. */
export function inScope(actor: Actor, resource: AccessResource): boolean {
  if (actor.role === 'staff' && actor.workProfile === 'sales') {
    return directSalesScope(actor, resource)
  }
  const assigned = (resource.assigneeIds ?? []).includes(actor.id)
  const assignedBy = resource.assignedById === actor.id
  const watching = (resource.watcherIds ?? []).includes(actor.id)
  const inGroup = resource.groupId !== undefined && actor.groupIds.includes(resource.groupId)
  return [ownsOrManagesOwner(actor, resource.ownerId), assigned, assignedBy, watching, inGroup].some(Boolean)
}

function recordTypeAllowed(actor: Actor, resource: AccessResource): boolean {
  return actor.recordTypes === undefined || actor.recordTypes.includes(resource.type)
}

function parentRestrictionAllows(actor: Actor, resource: AccessResource): boolean {
  if (!actor.unlinkedRecordTypes?.includes(resource.type)) return true
  return resource.parentId === undefined || resource.parentId === null
}

function relatedTypeAllowed(actor: Actor, resource: AccessResource): boolean {
  const allowedTypes = actor.relatedRecordTypes
  const relatedType = resource.relatedRecordType
  return (
    allowedTypes === undefined ||
    relatedType === undefined ||
    relatedType === null ||
    allowedTypes.includes(relatedType)
  )
}

/** Optional boundary-supplied record restrictions apply to staff; owners and managers work across the agency. */
export function workProfileAllows(actor: Actor, resource: AccessResource): boolean {
  if (actor.role !== 'staff') return true
  return (
    recordTypeAllowed(actor, resource) &&
    parentRestrictionAllows(actor, resource) &&
    relatedTypeAllowed(actor, resource)
  )
}

const scoped: Rule = (actor, resource) => isManagerUp(actor) || inScope(actor, resource)
function editable(actor: Actor, resource: AccessResource): boolean {
  if (actor.role === 'staff' && actor.workProfile === 'sales') return directSalesScope(actor, resource)
  return [
    isManagerUp(actor) || ownsOrManagesOwner(actor, resource.ownerId),
    resource.assignedById === actor.id,
    (resource.assigneeIds ?? []).includes(actor.id),
    resource.groupId !== undefined && actor.groupIds.includes(resource.groupId),
  ].some(Boolean)
}
const managerUp: Rule = (actor) => isManagerUp(actor)

const RULES: Readonly<Record<Action, Rule>> = {
  read: scoped,
  create: () => true,
  update: editable,
  delete: managerUp,
  assign: editable,
  convert: scoped,
  manage_settings: (actor) => actor.role === 'owner',
  manage_members: (actor, resource) =>
    actor.role === 'owner' || (actor.role === 'manager' && resource.role === 'staff'),
  manage_workflows: managerUp,
  manage_intake: managerUp,
  admin_panel: managerUp,
}

/** Pure permission check implementing the capability table of spec §9.10; inactive actors are denied everything. */
export const can: Can = (actor, action, resource) =>
  actor.active &&
  workProfileAllows(actor, resource) &&
  (resource.ownerOnly !== true || actor.role === 'owner') &&
  RULES[action](actor, resource)
