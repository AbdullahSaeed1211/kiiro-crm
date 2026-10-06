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
  readonly emptyInboxHint: string
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
  readonly composeHelp: string
  readonly composeTo: string
  readonly composeToPlaceholder: string
  readonly composeSubject: string
  readonly composeMessage: string
  readonly composeSend: string
  readonly composeSending: string
  readonly composeNeedAll: string
  readonly composeBadAddress: string
  readonly composeSendFailed: string
  /** `{email}` is the address typed in the search box. */
  readonly close: string
  readonly openFolders: string
  readonly closeFolders: string
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
    emptyInboxHint: 'New messages connected to your CRM records will appear here.',
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
    composeHelp: 'Write to anyone. A new address is added as a contact, so the message stays in their history.',
    composeTo: 'To',
    composeToPlaceholder: 'name@example.com, separate several with commas',
    composeSubject: 'Subject',
    composeMessage: 'Message',
    composeSend: 'Send',
    composeSending: 'Sending…',
    composeNeedAll: 'Add an address, a subject and a message.',
    composeBadAddress: 'Check the addresses. Each one needs a name, an @ and a domain.',
    composeSendFailed: 'The message was not sent. Try again.',

    close: 'Close',
    openFolders: 'Open mail folders',
    closeFolders: 'Close mail folders',
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
    emptyInboxHint: 'Los mensajes nuevos vinculados a tus registros de CRM aparecerán aquí.',
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
    composeHelp:
      'Escriba a cualquiera. Una dirección nueva se añade como contacto, así el mensaje queda en su historial.',
    composeTo: 'Para',
    composeToPlaceholder: 'nombre@ejemplo.com, separe varios con comas',
    composeSubject: 'Asunto',
    composeMessage: 'Mensaje',
    composeSend: 'Enviar',
    composeSending: 'Enviando…',
    composeNeedAll: 'Añada una dirección, un asunto y un mensaje.',
    composeBadAddress: 'Revise las direcciones. Cada una necesita un nombre, una @ y un dominio.',
    composeSendFailed: 'No se envió el mensaje. Inténtelo de nuevo.',
    close: 'Cerrar',
    openFolders: 'Abrir carpetas de correo',
    closeFolders: 'Cerrar carpetas de correo',
    unknownRecipient: 'Destinatario desconocido',
  },
}
