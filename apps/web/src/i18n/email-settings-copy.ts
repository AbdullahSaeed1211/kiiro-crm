import type { Locale } from './locale'

/** Settings, Email: the outbound sender (read-only) and the inbound addressing form. */
export interface EmailSettingsCopy {
  readonly outbound: string
  readonly available: string
  readonly unavailable: string
  readonly fromDeployment: string
  readonly notEnabled: string
  readonly fromName: string
  readonly fromAddress: string
  readonly notConfigured: string
  readonly inbound: string
  readonly inboundHelp: string
}

export const EMAIL_SETTINGS_COPY: Readonly<Record<Locale, EmailSettingsCopy>> = {
  en: {
    outbound: 'Outbound sender',
    available: 'Available',
    unavailable: 'Unavailable',
    fromDeployment: 'These values come from the deployed Worker configuration.',
    notEnabled: 'Email sending will be available after Cloudflare Email Sending is enabled.',
    fromName: 'From name',
    fromAddress: 'From address',
    notConfigured: 'Not configured',
    inbound: 'Inbound addressing',
    inboundHelp: 'These values are stored in workspace settings and used when composing inbound record addresses.',
  },
  es: {
    outbound: 'Remitente de salida',
    available: 'Disponible',
    unavailable: 'No disponible',
    fromDeployment: 'Estos valores vienen de la configuración desplegada del Worker.',
    notEnabled: 'El envío de correo estará disponible cuando se active Cloudflare Email Sending.',
    fromName: 'Nombre del remitente',
    fromAddress: 'Dirección del remitente',
    notConfigured: 'Sin configurar',
    inbound: 'Direcciones de entrada',
    inboundHelp:
      'Estos valores se guardan en los ajustes del espacio y se usan para componer las direcciones de entrada de cada registro.',
  },
}
