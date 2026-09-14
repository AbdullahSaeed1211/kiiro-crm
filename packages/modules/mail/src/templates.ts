import type { RenderedEmail, SystemEmailInput, TemplateName } from './contracts'
const LABELS: Readonly<Record<TemplateName, string>> = {
  invitation: 'invited you to',
  passwordReset: 'Reset your',
  assigned: 'assigned you:',
  mentioned: 'mentioned you on',
  dueSoon: 'Due soon:',
  overdue: 'Overdue:',
  digest: 'summary for',
  intakeReceived: 'New lead:',
  emailReceived: 'New email on',
  stalled: 'has been in',
}
/** Escapes interpolated values before they enter notification HTML. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
/** Renders the shared 600px notification layout with HTML and plain text. */
export function renderTemplate(input: SystemEmailInput): RenderedEmail {
  const prefix = input.actorName === undefined ? LABELS[input.template] : `${input.actorName} ${LABELS[input.template]}`
  const subject =
    input.template === 'passwordReset' ? `Reset your ${input.appName} password` : `${prefix} ${input.title}`
  const body = stalledBody(input)
  const text = `${body}\n${input.link}`
  const app = escapeHtml(input.appName)
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><strong>${app}</strong></td></tr><tr><td>${escapeHtml(body)}</td></tr><tr><td><a href="${escapeHtml(input.link)}">Open in ${app}</a></td></tr><tr><td>Manage notification settings in ${app}.</td></tr></table></td></tr></table>`
  return { subject, html, text }
}
function stalledBody(input: SystemEmailInput): string {
  return input.template === 'stalled' && input.stageName !== undefined
    ? `${input.title} has been in ${input.stageName} for ${String(input.days ?? 0)} days.`
    : input.title
}
