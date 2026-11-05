/** An absolute link on this tenant's host; the origin comes from `APP_ORIGIN` so every tenant links to itself. */
function appUrl(path: string): string {
  const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
  return `${origin.replace(/\/$/u, '')}${path}`
}

/** The link an invited person opens. */
export function invitationUrl(token: string): string {
  return appUrl(`/invite/${token}`)
}

/** The client portal link a client contact opens. */
export function portalUrl(token: string): string {
  return appUrl(`/portal/${token}`)
}
