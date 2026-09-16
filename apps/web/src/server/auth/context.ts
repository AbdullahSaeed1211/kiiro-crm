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

/** Request-scoped authentication and tenant context. */
export const getProductContext = cache(async (): Promise<ProductContext> => {
  const payload = await getPayload({ config })
  const auth = await payload.auth({ headers: await headers() })
  if (auth.user === null) redirect('/login')
  const req = await createLocalReq({ user: auth.user }, payload)
  const actor = await resolveActor(req)
  if (actor?.active !== true) redirect('/login')
  return { payload, req, actor, user: auth.user as unknown as Record<string, unknown> }
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
