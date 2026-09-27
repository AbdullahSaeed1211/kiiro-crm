import type { Locale } from './locale'

/** Error messaging for network and server failures. */
export const ERROR_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    networkFailure: 'Check your connection and try again.',
    serverFailure: 'Something went wrong on our side. Try again.',
  },
  es: {
    networkFailure: 'Verifica tu conexión e inténtalo de nuevo.',
    serverFailure: 'Algo salió mal en nuestro lado. Inténtalo de nuevo.',
  },
}
