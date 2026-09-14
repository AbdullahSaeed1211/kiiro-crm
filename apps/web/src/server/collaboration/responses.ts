export function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}

export function badRequest(error: string): Response {
  return Response.json({ error }, { status: 400 })
}
