/** The link an invited person opens; the origin comes from `APP_ORIGIN` so every tenant links to its own host. */
export function invitationUrl(token: string): string {
  const origin = process.env.APP_ORIGIN || 'http://localhost:3000'
  return `${origin.replace(/\/$/u, '')}/invite/${token}`
}
