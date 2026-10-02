import type { Locale } from './locale'

export interface OnboardingCopy {
  readonly steps: Readonly<
    Record<'workspace' | 'branding' | 'template' | 'team' | 'intake' | 'import' | 'done', string>
  >
  readonly heading: string
  /** `{step}` and `{total}` are numbers. */
  readonly stepOf: string
  readonly saveHint: string
  readonly workspaceName: string
  readonly timeZone: string
  readonly currency: string
  readonly locale: string
  readonly brandingHint: string
  readonly businessType: string
  readonly businessTypeHelp: string
  readonly intakeBefore: string
  readonly intakeLink: string
  readonly intakeMiddle: string
  readonly listsLink: string
  readonly importBefore: string
  readonly importLink: string
  readonly importAfter: string
  readonly doneHint: string
  readonly complete: string
  readonly back: string
  readonly saving: string
  readonly finish: string
  readonly saveAndContinue: string
}

export const ONBOARDING_COPY: Readonly<Record<Locale, OnboardingCopy>> = {
  en: {
    steps: {
      workspace: 'Workspace',
      branding: 'Branding',
      template: 'Business type',
      team: 'Team',
      intake: 'Lead intake',
      import: 'Import',
      done: 'Done',
    },
    heading: 'Workspace setup',
    stepOf: 'Step {step} of {total}',
    saveHint: 'Save this step and come back any time.',
    workspaceName: 'Workspace name',
    timeZone: 'Time zone',
    currency: 'Currency',
    locale: 'Locale',
    brandingHint: 'Branding is optional. You can upload a logo and favicon later from Settings → Branding.',
    businessType: 'Business type',
    businessTypeHelp: 'Choose a starting preset for terminology and workflows. You can refine fields and stages later.',
    intakeBefore: "Your website form is ready. Add your site's address and copy the embed code under ",
    intakeLink: 'Settings, Intake',
    intakeMiddle: ', and manage where leads come from under ',
    listsLink: 'Settings, Lists',
    importBefore: 'Bring in organizations, contacts, leads and deals from a spreadsheet under ',
    importLink: 'Settings, Import & export',
    importAfter: '. Continue when you are ready.',
    doneHint: 'Review complete. Finish to open the workspace.',
    complete: 'Setup complete. Your workspace is ready.',
    back: 'Back',
    saving: 'Saving…',
    finish: 'Finish setup',
    saveAndContinue: 'Save and continue',
  },
  es: {
    steps: {
      workspace: 'Espacio de trabajo',
      branding: 'Marca',
      template: 'Tipo de negocio',
      team: 'Equipo',
      intake: 'Captación de leads',
      import: 'Importar',
      done: 'Listo',
    },
    heading: 'Configuración del espacio',
    stepOf: 'Paso {step} de {total}',
    saveHint: 'Guarda este paso y vuelve cuando quieras.',
    workspaceName: 'Nombre del espacio',
    timeZone: 'Zona horaria',
    currency: 'Moneda',
    locale: 'Idioma',
    brandingHint: 'La marca es opcional. Puedes subir un logo y un favicon después en Configuración → Marca.',
    businessType: 'Tipo de negocio',
    businessTypeHelp:
      'Elige un punto de partida para los términos y los flujos. Puedes ajustar los campos y las etapas después.',
    intakeBefore: 'Tu formulario web está listo. Agrega la dirección de tu sitio y copia el código para insertarlo en ',
    intakeLink: 'Configuración, Captación',
    intakeMiddle: ', y gestiona de dónde vienen los leads en ',
    listsLink: 'Configuración, Listas',
    importBefore: 'Trae organizaciones, contactos, leads y negocios desde una hoja de cálculo en ',
    importLink: 'Configuración, Importar y exportar',
    importAfter: '. Continúa cuando estés listo.',
    doneHint: 'Revisión completa. Termina para abrir el espacio de trabajo.',
    complete: 'Configuración completa. Tu espacio de trabajo está listo.',
    back: 'Atrás',
    saving: 'Guardando…',
    finish: 'Terminar configuración',
    saveAndContinue: 'Guardar y continuar',
  },
}
