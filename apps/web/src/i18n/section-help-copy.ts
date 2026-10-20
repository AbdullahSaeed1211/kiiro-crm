import type { Locale } from './locale'

export type Section = 'leads' | 'deals' | 'projects' | 'contacts' | 'organizations' | 'tasks'

/** One plain sentence under each list's title: what the list is for and how it relates to the others. */
export const SECTION_HELP_COPY: Readonly<Record<Locale, Readonly<Record<Section, string>>>> = {
  en: {
    leads: 'People or companies that might become clients. Work a lead, then convert it into a deal.',
    deals: 'Work you have been asked to price. Follow each one from first talk to won or lost.',
    projects: 'The ongoing work you do for a client. Every project has its own tasks.',
    contacts: 'The people you deal with, each linked to the organization they work for.',
    organizations: 'The companies you work with. Their contacts, deals and projects are linked here.',
    tasks: 'Everything that needs doing, across every client and project.',
  },
  es: {
    leads: 'Personas o empresas que podrían ser clientes. Trabaja un prospecto y luego conviértelo en oportunidad.',
    deals: 'Trabajo que te pidieron cotizar. Sigue cada una desde el primer contacto hasta ganada o perdida.',
    projects: 'El trabajo continuo que haces para un cliente. Cada proyecto tiene sus propias tareas.',
    contacts: 'Las personas con las que tratas, cada una vinculada a su organización.',
    organizations: 'Las empresas con las que trabajas. Aquí se vinculan sus contactos, oportunidades y proyectos.',
    tasks: 'Todo lo que hay que hacer, en todos los clientes y proyectos.',
  },
}
