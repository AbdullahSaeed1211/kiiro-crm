import type { FilterCondition, FilterNode } from '@ops/kernel'
import type { Actor, ScopeDefinition, ScopeFilter } from '../contracts/access'
import { workProfileAllows } from './policy'

/** Filter that matches no rows, because every record has an id. */
export const MATCH_NOTHING: FilterCondition = { field: 'id', op: 'exists', value: false }

// Membership branches use `in` with a one-element list: it matches single and has-many relationship fields alike.
function branches(actor: Actor, definition: ScopeDefinition): FilterNode[] {
  const nodes: FilterNode[] = []
  if (definition.ownerField !== undefined) {
    nodes.push({ field: definition.ownerField, op: 'in', value: [actor.id, ...actor.reportIds] })
  }
  if (definition.assigneesField !== undefined) {
    nodes.push({ field: definition.assigneesField, op: 'in', value: [actor.id] })
  }
  if (definition.groupField !== undefined && actor.groupIds.length > 0) {
    nodes.push({ field: definition.groupField, op: 'in', value: actor.groupIds })
  }
  const extensions = definition.extensions ?? []
  return [...nodes, ...extensions.map((extension) => extension(actor))]
}

/**
 * Builds the staff scope of spec §9.10 for the given record types.
 * Returns no filter for active owners and managers, an OR of ownership branches for staff,
 * and {@link MATCH_NOTHING} for inactive actors and record types without a definition.
 */
export function createScopeFilter(definitions: Readonly<Record<string, ScopeDefinition>>): ScopeFilter {
  return (actor, recordType) => buildScope(actor, recordType, definitions[recordType])
}

function buildScope(actor: Actor, recordType: string, definition: ScopeDefinition | undefined): FilterNode | undefined {
  if (!actor.active) return MATCH_NOTHING
  if (actor.role === 'owner') return undefined
  if (actor.role === 'manager') return definition?.managerFilter
  return staffScope(actor, recordType, definition)
}

function staffScope(actor: Actor, recordType: string, definition: ScopeDefinition | undefined): FilterNode {
  if (!workProfileAllows(actor, { type: recordType })) return MATCH_NOTHING
  const nodes = definition === undefined ? [] : branches(actor, definition)
  if (nodes.length === 0) return MATCH_NOTHING
  const scope: FilterNode = { or: nodes }
  const filter = definition?.filter?.(actor)
  return filter === undefined ? scope : { and: [scope, filter] }
}
