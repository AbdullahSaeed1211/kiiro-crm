import type { Locale } from '../../i18n/locale'

const PHRASES: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    'member.invited': 'Invited a person',
    'member.invitation_revoked': 'Cancelled an invitation',
    'member.invitation_resent': 'Sent an invitation again',
    'member.access_changed': 'Changed a person’s access',
    'group.saved': 'Saved a group',
    'group.deleted': 'Deleted a group',
    'token.created': 'Made an API token',
    'token.revoked': 'Revoked an API token',
    'settings.changed': 'Changed settings',
    'export.downloaded': 'Downloaded data',
    'quote.created': 'Made a quote',
    'quote.sent': 'Sent a quote',
    'quote.accepted': 'Marked a quote accepted',
    'quote.declined': 'Marked a quote declined',
    'quote.void': 'Voided a quote',
    'invoice.created': 'Made an invoice',
    'invoice.sent': 'Sent an invoice',
    'invoice.paid': 'Marked an invoice paid',
    'invoice.void': 'Voided an invoice',
  },
  es: {
    'member.invited': 'Invitó a una persona',
    'member.invitation_revoked': 'Canceló una invitación',
    'member.invitation_resent': 'Reenvió una invitación',
    'member.access_changed': 'Cambió el acceso de una persona',
    'group.saved': 'Guardó un grupo',
    'group.deleted': 'Eliminó un grupo',
    'token.created': 'Creó un token de API',
    'token.revoked': 'Revocó un token de API',
    'settings.changed': 'Cambió ajustes',
    'export.downloaded': 'Descargó datos',
    'quote.created': 'Creó una cotización',
    'quote.sent': 'Envió una cotización',
    'quote.accepted': 'Marcó una cotización como aceptada',
    'quote.declined': 'Marcó una cotización como rechazada',
    'quote.void': 'Anuló una cotización',
    'invoice.created': 'Creó una factura',
    'invoice.sent': 'Envió una factura',
    'invoice.paid': 'Marcó una factura como pagada',
    'invoice.void': 'Anuló una factura',
  },
}

const FALLBACK: Readonly<Record<Locale, string>> = { en: 'Security event', es: 'Evento de seguridad' }

/** Every event the security log can show, for its filter list. */
export const AUDIT_VERBS: readonly string[] = Object.keys(PHRASES.en)

/** What a security event means, in words for a person, in the workspace language. */
export function describeAudit(verb: string, locale: Locale): string {
  return PHRASES[locale][verb] ?? FALLBACK[locale]
}
