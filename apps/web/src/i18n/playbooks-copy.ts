import type { Locale } from './locale'

export interface PlaybooksCopy {
  readonly intro: string
  readonly add: string
  readonly save: string
  readonly saving: string
}

export const PLAYBOOKS_COPY: Readonly<Record<Locale, PlaybooksCopy>> = {
  en: {
    intro:
      'When a deal is won, the playbook marked for won deals creates a project named after the deal, with these tasks. Due days count from the day the deal is won.',
    add: 'Add playbook',
    save: 'Save playbooks',
    saving: 'Saving…',
  },
  es: {
    intro:
      'Cuando se gana un oportunidad, la guía marcada para oportunidades ganados crea un proyecto con el nombre del oportunidad y estas tareas. Los días de vencimiento cuentan desde el día en que se gana el oportunidad.',
    add: 'Agregar guía',
    save: 'Guardar guías',
    saving: 'Guardando…',
  },
}
