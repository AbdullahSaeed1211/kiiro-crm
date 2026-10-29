import { isManagerUp, type Actor } from '@ops/platform'
import type { Where } from 'payload'

/** Applies the authorized personal, team, person, or unassigned lead scope for Today. */
export function todayLeadScope(
  actor: Actor,
  requestedTeam: boolean,
  person: string,
): Readonly<{ team: boolean; ownership: Where | undefined }> {
  const team = requestedTeam && isManagerUp(actor)
  if (!team) {
    const actorId = String(actor.id)
    return { team, ownership: { or: [{ owner: { equals: actorId } }, { assignees: { contains: actorId } }] } }
  }
  if (person === 'everyone') return { team, ownership: undefined }
  if (person === 'unassigned') {
    return { team, ownership: { and: [{ owner: { exists: false } }, { assignees: { exists: false } }] } }
  }
  return { team, ownership: { or: [{ owner: { equals: person } }, { assignees: { contains: person } }] } }
}

/** A follow-up drill-down accepts only a person exposed by the authorized Today scope. */
function maySelectTodayPerson(actor: Actor, requested: string): boolean {
  if (!isManagerUp(actor)) return false
  return actor.role === 'owner' || actor.reportIds.some((id) => String(id) === requested)
}

export function authorizedTodayLeadPerson(actor: Actor, requested: string | undefined): string | undefined {
  if (requested === undefined || requested === '' || requested === 'everyone') return undefined
  if (requested === 'me') return String(actor.id)
  if (requested === 'unassigned') return isManagerUp(actor) ? requested : undefined
  return maySelectTodayPerson(actor, requested) ? requested : undefined
}
