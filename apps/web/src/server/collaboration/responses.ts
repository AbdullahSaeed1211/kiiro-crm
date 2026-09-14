export function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 })
}

/** Converts Payload's expected not-found/access failures into one non-leaky response. */
export function payloadNotFoundOrDenied(error: unknown): Response | undefined {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (
    message.includes('not found') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('access')
  )
    return Response.json({ error: 'Not found' }, { status: 404 })
  return undefined
}
