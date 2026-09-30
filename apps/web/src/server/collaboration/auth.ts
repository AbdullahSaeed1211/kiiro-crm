import type { Payload, PayloadRequest, TypedUser } from 'payload'

export interface AuthContext {
  readonly user: TypedUser & Record<string, unknown>
  readonly id: string
  readonly role: 'owner' | 'manager' | 'staff'
}

function record(value: TypedUser): TypedUser & Record<string, unknown> {
  return value as TypedUser & Record<string, unknown>
}

/** Authenticates a product route using the same Payload cookie and session as the admin API. */
export async function authenticate(payload: Payload, request: Request): Promise<AuthContext | null> {
  const result = await payload.auth({ headers: request.headers })
  if (result.user === null) return null
  const user = record(result.user)
  if (user.active !== true) return null
  const roleValue = user.role
  const role = roleValue === 'owner' || roleValue === 'manager' ? roleValue : 'staff'
  return { user, id: user.id, role }
}

/** A Payload local request that carries the authenticated user, for reads and writes made on their behalf. */
export function requestForUser(payload: Payload, user: Record<string, unknown>): PayloadRequest {
  return { payload, user } as unknown as PayloadRequest
}
