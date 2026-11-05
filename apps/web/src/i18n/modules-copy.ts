import type { Locale } from './locale'

interface ModuleText {
  readonly label: string
  readonly description: string
  readonly dependency?: string
}

/** Settings, Modules: the intro, the four modules and the form's own messages. */
export interface ModulesCopy {
  readonly intro: string
  readonly modules: Readonly<{ crm: ModuleText; work: ModuleText; intake: ModuleText; mail: ModuleText }>
  /** `{name}` is the module's label. */
  readonly moduleAria: string
  readonly save: string
  readonly saving: string
  readonly saved: string
  readonly failed: string
}

export const MODULES_COPY: Readonly<Record<Locale, ModulesCopy>> = {
  en: {
    intro:
      'Turn off surfaces your business does not use. Existing data remains safely stored and can be shown again later.',
    modules: {
      crm: { label: 'CRM', description: 'Leads, deals, contacts, organizations, and pipelines.' },
      work: { label: 'Work', description: 'Tasks, projects, calendar, and timeline.' },
      intake: { label: 'Intake', description: 'Public lead forms and secure submission review.' },
      mail: {
        label: 'Mail',
        description: 'Inbound record addressing and email notifications.',
        dependency: 'Requires an outbound sender to send system email.',
      },
    },
    moduleAria: '{name} module',
    save: 'Save modules',
    saving: 'Saving…',
    saved: 'Modules saved.',
    failed: 'Unable to save modules. Try again.',
  },
  es: {
    intro:
      'Desactiva lo que tu negocio no usa. Los datos existentes siguen guardados y se pueden mostrar de nuevo más adelante.',
    modules: {
      crm: { label: 'CRM', description: 'Prospectos, oportunidades, contactos, organizaciones y embudos.' },
      work: { label: 'Trabajo', description: 'Tareas, proyectos, calendario y cronología.' },
      intake: { label: 'Captura', description: 'Formularios públicos de prospectos y revisión segura de envíos.' },
      mail: {
        label: 'Correo',
        description: 'Direcciones de entrada por registro y notificaciones por correo.',
        dependency: 'Requiere un remitente de salida para enviar correo del sistema.',
      },
    },
    moduleAria: 'Módulo {name}',
    save: 'Guardar módulos',
    saving: 'Guardando…',
    saved: 'Módulos guardados.',
    failed: 'No se pudieron guardar los módulos. Inténtalo de nuevo.',
  },
}
