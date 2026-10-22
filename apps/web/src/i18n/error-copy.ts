import type { Locale } from './locale'

/** Shown when a client request never reached the server; each action keeps its own copy for server failures. */
export const ERROR_COPY = {
  en: {
    networkFailure: 'Check your connection and try again.',
    saveFailed: 'The save did not work. Try again.',
    loadFailed: 'This information could not be loaded. Try again to see the latest records.',
    retry: 'Try again',
    retrying: 'Loading…',
    pageFailed: 'This page could not be loaded',
    newerVersion: 'A newer version is available',
    reloading: 'Reloading to pick up the latest version.',
    reload: 'Reload',
  },
  es: {
    networkFailure: 'Verifica tu conexión e inténtalo de nuevo.',
    saveFailed: 'No se pudo guardar. Inténtalo de nuevo.',
    loadFailed: 'No se pudo cargar esta información. Reintenta para ver los registros más recientes.',
    retry: 'Reintentar',
    retrying: 'Cargando…',
    pageFailed: 'No se pudo cargar esta página',
    newerVersion: 'Hay una nueva versión disponible',
    reloading: 'Recargando para obtener la última versión.',
    reload: 'Recargar',
  },
} satisfies Record<Locale, Record<string, string>>
