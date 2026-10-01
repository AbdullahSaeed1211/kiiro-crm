import config from '@payload-config'
import { resolveActor } from '@ops/adapter-payload'
import { type Actor, type Role } from '@ops/platform'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { cache } from 'react'
import { userForApiToken } from './api-tokens'

type AuthedUser = NonNullable<PayloadRequest['user']>

export interface ProductContext {
  readonly payload: Payload
  readonly req: PayloadRequest
  readonly actor: Actor
  readonly user: Record<string, unknown>
}

/** The signed-in user: a session cookie, or a personal API token sent as `Authorization: Bearer ops_...`. */
async function authenticate(payload: Payload, requestHeaders: Headers): Promise<{ user: AuthedUser } | null> {
  const bearer = /^Bearer (ops_\S+)$/u.exec(requestHeaders.get('authorization') ?? '')?.[1]
  if (bearer !== undefined) {
    const user = await userForApiToken(payload, bearer)
    return user === null ? null : { user: { ...user, collection: 'users' } }
  }
  const auth = await payload.auth({ headers: requestHeaders })
  return auth.user === null ? null : { user: auth.user }
}

/** Request-scoped authentication and tenant context, or `null` without an active session. API routes use this. */
export const findProductContext = cache(async (): Promise<ProductContext | null> => {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const auth = await authenticate(payload, requestHeaders)
  if (auth === null) return null
  const req = await createLocalReq({ user: auth.user }, payload)
  const actor = await resolveActor(req)
  if (actor?.active !== true) return null
  return { payload, req, actor, user: auth.user as unknown as Record<string, unknown> }
})

/** Request-scoped authentication and tenant context; pages without an active session redirect to login. */
export const getProductContext = cache(async (): Promise<ProductContext> => {
  const context = await findProductContext()
  if (context === null) redirect('/login')
  return context
})

/** Request-scoped workspace settings shared by layouts and page queries. */
export const getWorkspaceSettings = cache(async (): Promise<Record<string, unknown>> => {
  const context = await getProductContext()
  return (await context.payload.findGlobal({
    slug: 'settings',
    depth: 0,
    overrideAccess: false,
    req: context.req,
  })) as unknown as Record<string, unknown>
})

export async function requireRole(...roles: readonly Role[]): Promise<ProductContext> {
  const context = await getProductContext()
  if (!roles.includes(context.actor.role)) notFound()
  return context
}
