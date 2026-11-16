import type { Actor } from '@ops/platform'

/** Main app routes available to sales-profile staff, including their private lead intake form. */
export function salesRouteAllowed(actor: Actor, pathname: string): boolean {
  if (actor.role !== 'staff' || actor.workProfile !== 'sales') return true
  return (
    pathname === '/leads' ||
    (pathname.startsWith('/leads/') && pathname !== '/leads/board' && !pathname.startsWith('/leads/board/')) ||
    pathname === '/settings/profile'
  )
}
