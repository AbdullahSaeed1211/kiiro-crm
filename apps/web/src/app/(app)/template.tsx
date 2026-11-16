import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getProductContext } from '../../server/auth/context'
import { salesRouteAllowed } from '../../server/auth/sales-route'

/** Rechecks the sales route boundary on client navigations when the persistent app layout stays mounted. */
export default async function AppTemplate({ children }: Readonly<{ children: ReactNode }>) {
  const [requestHeaders, context] = await Promise.all([headers(), getProductContext()])
  if (!salesRouteAllowed(context.actor, requestHeaders.get('x-ops-pathname') ?? '/')) redirect('/leads')
  return children
}
