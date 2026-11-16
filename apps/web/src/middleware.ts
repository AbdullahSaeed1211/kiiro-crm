import { NextResponse, type NextRequest } from 'next/server'

/** Adds the requested path for the authenticated app layout's profile route guard. */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-ops-pathname', request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
