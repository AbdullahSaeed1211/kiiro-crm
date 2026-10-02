import type { Locale } from './locale'

/** Shown when a client request never reached the server; each action keeps its own copy for server failures. */
export const ERROR_COPY: Readonly<Record<Locale, Readonly<{ networkFailure: string; saveFailed: string }>>> = {
  en: { networkFailure: 'Check your connection and try again.', saveFailed: 'The save did not work. Try again.' },
  es: {
    networkFailure: 'Verifica tu conexión e inténtalo de nuevo.',
    saveFailed: 'No se pudo guardar. Inténtalo de nuevo.',
  },
}
