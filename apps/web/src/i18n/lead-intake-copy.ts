import type { Locale } from './config'

export const LEAD_INTAKE_COPY: Readonly<
  Record<
    Locale,
    Readonly<{ title: string; description: string; chooseForm: string; empty: string; embeddedForm: string }>
  >
> = {
  en: {
    title: 'Lead intake',
    description: 'Choose a published form to capture a new lead.',
    chooseForm: 'Form',
    empty: 'There are no active hosted lead forms.',
    embeddedForm: 'Hosted lead intake form',
  },
  es: {
    title: 'Captura de prospectos',
    description: 'Elige un formulario publicado para registrar un prospecto.',
    chooseForm: 'Formulario',
    empty: 'No hay formularios activos para prospectos.',
    embeddedForm: 'Formulario alojado de captura de prospectos',
  },
}
