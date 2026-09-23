import type { Locale } from './locale'

export interface InboxCopy {
  readonly title: string
  readonly compose: string
  readonly mail: string
  readonly description: string
  readonly back: string
  readonly markRead: string
  readonly folders: string
  readonly hasAttachments: string
  readonly receivedStatus: string
  readonly sentStatus: string
  readonly queuedStatus: string
  readonly failedStatus: string
  readonly toPrefix: string
  readonly inboxFolder: string
  readonly sentFolder: string
  readonly failedFolder: string
  readonly allFolder: string
  readonly search: string
  readonly searchPlaceholder: string
  readonly noMessages: string
  readonly noMatches: string
  readonly selectMessage: string
  readonly noSubject: string
  readonly unread: string
  readonly read: string
  readonly messages: string
  readonly message: string
  readonly openRecord: string
  readonly unlinked: string
  readonly composeTitle: string
  readonly composeUnavailable: string
  readonly composeLinkedOnly: string
  readonly close: string
  readonly to: string
  readonly subject: string
  readonly messageBody: string
  readonly send: string
  readonly unknownRecipient: string
}

export const INBOX_COPY: Readonly<Record<Locale, InboxCopy>> = {
  en: {
    title: 'Inbox',
    compose: 'Compose',
    mail: 'Mail',
    description: 'Messages connected to your CRM records',
    back: 'Back',
    markRead: 'Mark read',
    folders: 'Mail folders',
    hasAttachments: 'Has attachments',
    receivedStatus: 'Received',
    sentStatus: 'Sent',
    queuedStatus: 'Queued',
    failedStatus: 'Failed',
    toPrefix: 'To',
    inboxFolder: 'Inbox',
    sentFolder: 'Sent',
    failedFolder: 'Failed',
    allFolder: 'All mail',
    search: 'Search messages',
    searchPlaceholder: 'Search mail',
    noMessages: 'No conversations here yet.',
    noMatches: 'No conversations match your search.',
    selectMessage: 'Select a conversation to read it.',
    noSubject: '(no subject)',
    unread: 'Unread',
    read: 'Read',
    messages: 'messages',
    message: 'message',
    openRecord: 'Open linked record',
    unlinked: 'No linked record',
    composeTitle: 'New message',
    composeUnavailable: 'Outbound sending is not enabled yet. You can still review your inbox and linked records.',
    composeLinkedOnly: 'Inbox-wide sending is not available. Open a linked record to compose a message.',
    close: 'Close',
    to: 'To',
    subject: 'Subject',
    messageBody: 'Message',
    send: 'Send',
    unknownRecipient: 'Unknown recipient',
  },
  es: {
    title: 'Bandeja de entrada',
    compose: 'Redactar',
    mail: 'Correo',
    description: 'Mensajes vinculados a tus registros de CRM',
    back: 'Volver',
    markRead: 'Marcar como leído',
    folders: 'Carpetas de correo',
    hasAttachments: 'Tiene archivos adjuntos',
    receivedStatus: 'Recibido',
    sentStatus: 'Enviado',
    queuedStatus: 'En cola',
    failedStatus: 'Fallido',
    toPrefix: 'Para',
    inboxFolder: 'Bandeja de entrada',
    sentFolder: 'Enviados',
    failedFolder: 'Fallidos',
    allFolder: 'Todo el correo',
    search: 'Buscar mensajes',
    searchPlaceholder: 'Buscar correo',
    noMessages: 'Todavía no hay conversaciones aquí.',
    noMatches: 'No hay conversaciones que coincidan con la búsqueda.',
    selectMessage: 'Selecciona una conversación para leerla.',
    noSubject: '(sin asunto)',
    unread: 'Sin leer',
    read: 'Leído',
    messages: 'mensajes',
    message: 'mensaje',
    openRecord: 'Abrir registro vinculado',
    unlinked: 'Registro sin vínculo',
    composeTitle: 'Nuevo mensaje',
    composeUnavailable:
      'El envío de correo aún no está habilitado. Puedes revisar la bandeja y los registros vinculados.',
    composeLinkedOnly: 'El envío desde la bandeja no está disponible. Abre un registro vinculado para redactar.',
    close: 'Cerrar',
    to: 'Para',
    subject: 'Asunto',
    messageBody: 'Mensaje',
    send: 'Enviar',
    unknownRecipient: 'Destinatario desconocido',
  },
}
