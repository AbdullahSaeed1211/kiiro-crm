import type { Locale } from './locale'

interface TypeText {
  readonly label: string
  readonly description: string
}

/** Settings, Notifications: the channel matrix, the digest time and the form's messages. */
export interface NotificationSettingsCopy {
  readonly types: Readonly<Record<string, TypeText>>
  readonly notification: string
  readonly inApp: string
  readonly email: string
  /** `{name}` is the notification type, `{channel}` the column. */
  readonly channelAria: string
  readonly digestTime: string
  readonly digestHelp: string
  readonly save: string
  readonly saving: string
  readonly saved: string
  readonly failed: string
}

export const NOTIFICATION_SETTINGS_COPY: Readonly<Record<Locale, NotificationSettingsCopy>> = {
  en: {
    types: {
      assigned: { label: 'Assigned to you', description: 'A record or task is assigned to you.' },
      mentioned: { label: 'Mentions', description: 'Someone mentions you in a comment.' },
      due_soon: { label: 'Due soon', description: 'A task is approaching its due date.' },
      overdue: { label: 'Overdue', description: 'A task has passed its due date.' },
      digest: { label: 'Daily digest', description: 'A daily summary of workspace activity.' },
      intake_received: { label: 'New intake', description: 'A public form receives a submission.' },
      email_received: { label: 'Record email', description: 'A message arrives for one of your records.' },
      invitation_accepted: { label: 'Invitation accepted', description: 'A teammate accepts an invitation.' },
      stalled: {
        label: 'Stalled records',
        description: 'A record has not changed for the configured threshold.',
      },
      automation: {
        label: 'Automation',
        description: 'A rule notifies you about a record.',
      },
    },
    notification: 'Notification',
    inApp: 'In-app',
    email: 'Email',
    channelAria: '{name} {channel}',
    digestTime: 'Digest time',
    digestHelp: 'Uses the workspace timezone.',
    save: 'Save preferences',
    saving: 'Saving…',
    saved: 'Notification preferences saved.',
    failed: 'Unable to save preferences. Try again.',
  },
  es: {
    types: {
      assigned: { label: 'Asignado a ti', description: 'Te asignan un registro o una tarea.' },
      mentioned: { label: 'Menciones', description: 'Alguien te menciona en un comentario.' },
      due_soon: { label: 'Vence pronto', description: 'Una tarea se acerca a su fecha límite.' },
      overdue: { label: 'Vencidas', description: 'Una tarea pasó su fecha límite.' },
      digest: { label: 'Resumen diario', description: 'Un resumen diario de la actividad del espacio.' },
      intake_received: { label: 'Nueva captura', description: 'Un formulario público recibe un envío.' },
      email_received: { label: 'Correo del registro', description: 'Llega un mensaje para uno de tus registros.' },
      invitation_accepted: { label: 'Invitación aceptada', description: 'Un compañero acepta una invitación.' },
      stalled: {
        label: 'Registros estancados',
        description: 'Un registro no ha cambiado durante el umbral configurado.',
      },
      automation: {
        label: 'Automatización',
        description: 'Una regla te avisa sobre un registro.',
      },
    },
    notification: 'Notificación',
    inApp: 'En la app',
    email: 'Correo',
    channelAria: '{name} {channel}',
    digestTime: 'Hora del resumen',
    digestHelp: 'Usa la zona horaria del espacio.',
    save: 'Guardar preferencias',
    saving: 'Guardando…',
    saved: 'Preferencias de notificaciones guardadas.',
    failed: 'No se pudieron guardar las preferencias. Inténtalo de nuevo.',
  },
}
