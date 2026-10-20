import type { Locale } from './locale'

export const NOTIFICATION_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    label: 'Notifications',
    description: 'Updates that need your attention.',
    loading: 'Loading updates…',
    loadFailed: 'Could not load updates. Close this panel and try again.',
    caughtUp: 'You’re all caught up.',
    readFailed: 'Could not mark this notification as read. Try again.',
    markAllRead: 'Mark these updates as read',
    markingAll: 'Marking…',
  },
  es: {
    label: 'Notificaciones',
    description: 'Novedades que requieren tu atención.',
    loading: 'Cargando novedades…',
    loadFailed: 'No se pudieron cargar las novedades. Cierra este panel e inténtalo de nuevo.',
    caughtUp: 'Estás al día.',
    readFailed: 'No se pudo marcar la notificación como leída. Inténtalo de nuevo.',
    markAllRead: 'Marcar estas novedades como leídas',
    markingAll: 'Marcando…',
  },
}
