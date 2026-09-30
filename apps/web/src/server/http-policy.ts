/** Payload's own set-password routes; every password change goes through the product's auth routes (spec §12). */
const BLOCKED_PAYLOAD_PATHS = new Set([
  '/api/users/forgot-password',
  '/api/users/reset-password',
  '/api/users/unlock',
  '/api/users/first-register',
])

/** Headers every response carries (spec §24). A Content-Security-Policy follows once inline scripts carry nonces. */
const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
}

/** True for the Payload auth routes the product answers with 404; admin login, logout, me and refresh stay open. */
export function isBlockedPayloadRoute(method: string, pathname: string): boolean {
  let path = pathname
  while (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  if (BLOCKED_PAYLOAD_PATHS.has(path) || path.startsWith('/api/users/verify/')) return true
  return method === 'POST' && path === '/api/users'
}

/** Hosted intake forms are made to be embedded on customers' websites, so only they may be framed. */
const isEmbeddablePath = (pathname: string): boolean => pathname.startsWith('/forms/')

/** Copies the response with the security headers set; upgrade responses pass through untouched. */
export function withSecurityHeaders(response: Response, pathname = ''): Response {
  if (response.status === 101) return response
  const secured = new Response(response.body, response)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) secured.headers.set(name, value)
  if (isEmbeddablePath(pathname)) secured.headers.delete('X-Frame-Options')
  return secured
}
