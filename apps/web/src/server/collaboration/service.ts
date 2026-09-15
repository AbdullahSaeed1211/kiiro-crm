import type { Payload } from 'payload'
import { scopedSearch, type SearchResult } from '../../../../../packages/adapters/payload/src/collaboration/search'
import { type AuthContext } from './auth'

/** Search facade used by the route so every query carries the authenticated Payload user. */
export function searchWorkspace(
  payload: Payload,
  context: AuthContext,
  query: string,
): Promise<readonly SearchResult[]> {
  return scopedSearch(payload, { user: context.user, query })
}
