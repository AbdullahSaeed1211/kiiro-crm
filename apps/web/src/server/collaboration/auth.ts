import type { Payload, TypedUser } from 'payload'

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
