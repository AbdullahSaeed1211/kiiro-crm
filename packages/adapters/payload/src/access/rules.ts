import type { Id } from '@ops/kernel'
import { createScopeFilter, isManagerUp, type Actor, type ScopeDefinition, type ScopeExtension } from '@ops/platform'
import type { Access, Where } from 'payload'
import { FIELDS, RECORD_TYPES } from '../contracts/names'
import { toWhere } from '../where/to-where'
import { resolveActor } from './actor'

type Rule = (actor: Actor) => boolean | Where

const memberOf =
  (field: string): ScopeExtension =>
  (actor) => ({ field, op: 'in', value: [actor.id] })

/** Staff scope of the spike record types (spec §9.10): project members also see the project's tasks. */
export const SPIKE_SCOPES: Readonly<Record<string, ScopeDefinition>> = {
  [RECORD_TYPES.organizations]: { ownerField: FIELDS.owner },
  [RECORD_TYPES.projects]: { ownerField: FIELDS.owner, extensions: [memberOf(FIELDS.members)] },
  [RECORD_TYPES.tasks]: {
    assigneesField: FIELDS.assignees,
    groupField: FIELDS.group,
    extensions: [memberOf(`${FIELDS.project}.${FIELDS.members}`)],
  },
}

const scopeFilter = createScopeFilter(SPIKE_SCOPES)

/** Turns an actor rule into a Payload access function; anonymous requests and inactive users are denied. */
export function allow(rule: Rule): Access {
  return async ({ req }) => {
    const actor = await resolveActor(req)
    return actor?.active === true ? rule(actor) : false
  }
}

/** Denies every API request; system writes use the Local API with `overrideAccess: true`. */
export const systemOnly: Access = () => false

/** Any active user. */
export const anyActive = allow(() => true)

/** Owners and managers. */
export const managerUp = allow(isManagerUp)

/** Owners only. */
export const ownerOnly = allow((actor) => actor.role === 'owner')

/** Everything for owners and managers; the staff scope of `recordType` for staff. */
export function scoped(recordType: string): Access {
  return allow((actor) => {
    const scope = scopeFilter(actor, recordType)
    return scope === undefined ? true : toWhere(scope)
  })
}

/** Documents whose `field` points at the actor. */
export function ownedBy(field: string): Access {
  return allow((actor) => equalsActor(field, actor.id))
}

/** Where clause matching documents whose `field` equals `id`. */
export function equalsActor(field: string, id: Id): Where {
  return { [field]: { equals: id } }
}
