import config from '@payload-config'
import { resolveActor } from '@ops/adapter-payload'
import { type Actor, type Role } from '@ops/platform'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'
import { cache } from 'react'

export interface ProductContext {
  readonly payload: Payload
  readonly req: PayloadRequest
  readonly actor: Actor
  readonly user: Record<string, unknown>
}

/** Request-scoped authentication and tenant context, or `null` without an active session. API routes use this. */
export const findProductContext = cache(async (): Promise<ProductContext | null> => {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })
  if (auth.user === null) return null
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
