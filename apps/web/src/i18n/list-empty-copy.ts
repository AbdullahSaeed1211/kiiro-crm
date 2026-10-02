import type { Locale } from './locale'

export type ListKind = 'leads' | 'deals' | 'contacts' | 'organizations' | 'projects'

interface ListEmptyKindCopy {
  /** Shown when the list has nothing in it at all. */
  readonly emptyTitle: string
  readonly emptyBody: string
  /** Shown when a search or filter finds nothing. */
  readonly noMatchTitle: string
  /** The create button; left out when the list has no create page. */
  readonly create?: string
}

export interface ListEmptyCopy {
  readonly noMatchBody: string
  readonly clear: string
  readonly kinds: Readonly<Record<ListKind, ListEmptyKindCopy>>
}

export const LIST_EMPTY_COPY: Readonly<Record<Locale, ListEmptyCopy>> = {
  en: {
    noMatchBody: 'Try a different word, or clear the search and filters.',
    clear: 'Clear search and filters',
    kinds: {
      leads: {
        emptyTitle: 'No leads yet',
        emptyBody: 'Add a lead, or connect a website form, to start your pipeline.',
        noMatchTitle: 'No leads match',
        create: 'New lead',
      },
      deals: {
        emptyTitle: 'No deals yet',
        emptyBody: 'Add a deal to start tracking your pipeline.',
        noMatchTitle: 'No deals match',
      },
      contacts: {
        emptyTitle: 'No contacts yet',
        emptyBody: 'Add the people you work with.',
        noMatchTitle: 'No contacts match',
        create: 'New contact',
      },
      organizations: {
        emptyTitle: 'No organizations yet',
        emptyBody: 'Add the companies you work with.',
        noMatchTitle: 'No organizations match',
        create: 'New organization',
      },
      projects: {
        emptyTitle: 'No projects yet',
        emptyBody: 'Projects you create or join show up here.',
        noMatchTitle: 'No projects match',
      },
    },
  },
  es: {
    noMatchBody: 'Prueba con otra palabra, o borra la búsqueda y los filtros.',
    clear: 'Borrar búsqueda y filtros',
    kinds: {
      leads: {
        emptyTitle: 'Aún no hay leads',
        emptyBody: 'Agrega un lead, o conecta un formulario web, para empezar tu embudo.',
        noMatchTitle: 'Ningún lead coincide',
        create: 'Nuevo lead',
      },
      deals: {
        emptyTitle: 'Aún no hay negocios',
        emptyBody: 'Agrega un negocio para seguir tu embudo.',
        noMatchTitle: 'Ningún negocio coincide',
      },
      contacts: {
        emptyTitle: 'Aún no hay contactos',
        emptyBody: 'Agrega a las personas con las que trabajas.',
        noMatchTitle: 'Ningún contacto coincide',
        create: 'Nuevo contacto',
      },
      organizations: {
        emptyTitle: 'Aún no hay organizaciones',
        emptyBody: 'Agrega las empresas con las que trabajas.',
        noMatchTitle: 'Ninguna organización coincide',
        create: 'Nueva organización',
      },
      projects: {
        emptyTitle: 'Aún no hay proyectos',
        emptyBody: 'Los proyectos que crees o a los que te unas aparecerán aquí.',
        noMatchTitle: 'Ningún proyecto coincide',
      },
    },
  },
}
