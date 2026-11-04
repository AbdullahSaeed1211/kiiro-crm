import type { Locale } from './locale'

export interface NavCopy {
  readonly create: string
  readonly account: string
  readonly profile: string
  readonly theme: string
  readonly light: string
  readonly dark: string
  readonly system: string
  readonly overdue: string
  readonly toFollowUp: string
}

export const NAV_COPY: Readonly<Record<Locale, NavCopy>> = {
  en: {
    create: 'New',
    account: 'Account',
    profile: 'Profile',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    overdue: '{count} overdue',
    toFollowUp: '{count} to follow up',
  },
  es: {
    create: 'Nuevo',
    account: 'Cuenta',
    profile: 'Perfil',
    theme: 'Tema',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
    overdue: '{count} vencidas',
    toFollowUp: '{count} por seguir',
  },
}
