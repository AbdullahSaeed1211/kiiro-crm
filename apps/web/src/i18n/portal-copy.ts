import type { Locale } from './locale'

/** The client portal card on a client's Billing tab. `{email}` and `{date}` are filled in. */
export interface PortalStaffCopy {
  readonly title: string
  readonly help: string
  readonly recipient: string
  readonly noRecipients: string
  readonly create: string
  readonly creating: string
  readonly created: string
  readonly copyLabel: string
  readonly emailIt: string
  readonly emailing: string
  readonly emailed: string
  readonly emailFailed: string
  readonly emailSubject: string
  /** `{company}`, `{url}` and `{days}` are filled in. */
  readonly emailBody: string
  readonly sent: string
  readonly none: string
  readonly states: Readonly<Record<'active' | 'expired' | 'revoked', string>>
  readonly until: string
  readonly opened: string
  readonly neverOpened: string
  readonly revoke: string
  readonly revokeTitle: string
  readonly revokeHelp: string
  readonly revoking: string
  readonly cancel: string
}

/** The client's own pages. */
export interface PortalClientCopy {
  readonly title: string
  readonly intro: string
  readonly toAnswer: string
  readonly quotes: string
  readonly invoices: string
  readonly projects: string
  readonly nothing: string
  readonly view: string
  readonly back: string
  readonly print: string
  readonly pay: string
  readonly accept: string
  readonly decline: string
  readonly declineConfirm: string
  readonly answering: string
  readonly answered: string
  readonly tasksDone: string
  readonly targetDate: string
  readonly invalidTitle: string
  readonly invalidHelp: string
  readonly poweredBy: string
}

export const PORTAL_STAFF_COPY: Readonly<Record<Locale, PortalStaffCopy>> = {
  en: {
    title: 'Client portal',
    help: 'Give a contact a private link to see quotes, invoices and project progress, and to accept quotes. No password. Links last {days} days.',
    recipient: 'Send to',
    noRecipients: 'Add a contact with an email to this client first.',
    create: 'Create link',
    creating: 'Creating…',
    created: 'Link ready. Copy it now: it is shown only once.',
    copyLabel: 'Portal link',
    emailIt: 'Email to {email}',
    emailing: 'Sending…',
    emailed: 'Sent to {email}.',
    emailFailed: 'Could not send. Copy the link instead.',
    emailSubject: 'Your {company} portal',
    emailBody:
      'Hello,\n\nSee your quotes, invoices and project progress here:\n\n{url}\n\nThis link is private and lasts {days} days.',
    sent: 'Sent links',
    none: 'No links sent yet.',
    states: { active: 'Active', expired: 'Expired', revoked: 'Revoked' },
    until: 'until {date}',
    opened: 'last opened {date}',
    neverOpened: 'not opened yet',
    revoke: 'Revoke',
    revokeTitle: 'Revoke this link?',
    revokeHelp: 'It stops working right away.',
    revoking: 'Revoking…',
    cancel: 'Cancel',
  },
  es: {
    title: 'Portal del cliente',
    help: 'Da a un contacto un enlace privado para ver cotizaciones, facturas y el avance de proyectos, y aceptar cotizaciones. Sin contraseña. Los enlaces duran {days} días.',
    recipient: 'Enviar a',
    noRecipients: 'Primero agrega un contacto con correo a este cliente.',
    create: 'Crear enlace',
    creating: 'Creando…',
    created: 'Enlace listo. Cópialo ahora: solo se muestra una vez.',
    copyLabel: 'Enlace del portal',
    emailIt: 'Enviar a {email}',
    emailing: 'Enviando…',
    emailed: 'Enviado a {email}.',
    emailFailed: 'No se pudo enviar. Copia el enlace.',
    emailSubject: 'Tu portal de {company}',
    emailBody:
      'Hola:\n\nAquí ves tus cotizaciones, facturas y el avance de tus proyectos:\n\n{url}\n\nEste enlace es privado y dura {days} días.',
    sent: 'Enlaces enviados',
    none: 'Aún no se ha enviado ningún enlace.',
    states: { active: 'Activo', expired: 'Vencido', revoked: 'Revocado' },
    until: 'hasta el {date}',
    opened: 'abierto por última vez el {date}',
    neverOpened: 'aún no abierto',
    revoke: 'Revocar',
    revokeTitle: '¿Revocar este enlace?',
    revokeHelp: 'Deja de funcionar al instante.',
    revoking: 'Revocando…',
    cancel: 'Cancelar',
  },
}

export const PORTAL_CLIENT_COPY: Readonly<Record<Locale, PortalClientCopy>> = {
  en: {
    title: '{company}',
    intro: 'Your quotes, invoices and projects with {agency}.',
    toAnswer: 'Needs your answer',
    quotes: 'Quotes',
    invoices: 'Invoices',
    projects: 'Projects',
    nothing: 'Nothing here yet.',
    view: 'View',
    back: 'Back to your portal',
    print: 'Print or save as PDF',
    pay: 'Pay now',
    accept: 'Accept quote',
    decline: 'Decline',
    declineConfirm: 'Decline this quote?',
    answering: 'Saving…',
    answered: 'Thanks. {agency} has your answer.',
    tasksDone: '{done} of {total} tasks done',
    targetDate: 'Target {date}',
    invalidTitle: 'This link no longer works',
    invalidHelp: 'Links expire. Ask your contact for a new one.',
    poweredBy: 'This page is private to you.',
  },
  es: {
    title: '{company}',
    intro: 'Tus cotizaciones, facturas y proyectos con {agency}.',
    toAnswer: 'Necesita tu respuesta',
    quotes: 'Cotizaciones',
    invoices: 'Facturas',
    projects: 'Proyectos',
    nothing: 'Aún no hay nada.',
    view: 'Ver',
    back: 'Volver a tu portal',
    print: 'Imprimir o guardar como PDF',
    pay: 'Pagar ahora',
    accept: 'Aceptar cotización',
    decline: 'Rechazar',
    declineConfirm: '¿Rechazar esta cotización?',
    answering: 'Guardando…',
    answered: 'Gracias. {agency} ya tiene tu respuesta.',
    tasksDone: '{done} de {total} tareas hechas',
    targetDate: 'Objetivo: {date}',
    invalidTitle: 'Este enlace ya no funciona',
    invalidHelp: 'Los enlaces vencen. Pide uno nuevo a tu contacto.',
    poweredBy: 'Esta página es privada.',
  },
}
