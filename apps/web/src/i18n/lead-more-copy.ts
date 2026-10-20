import type { Locale } from './locale'

export interface LeadMoreCopy {
  readonly more: string
  readonly views: string
  readonly allOpenLeads: string
  readonly saveView: string
  readonly saveViewTitle: string
  readonly viewName: string
  readonly save: string
  readonly cancel: string
  readonly import: string
  readonly export: string
  readonly files: string
  readonly saveFailed: string
}

export const LEAD_MORE_COPY: Readonly<Record<Locale, LeadMoreCopy>> = {
  en: {
    more: 'More',
    views: 'Views',
    allOpenLeads: 'All open leads',
    saveView: 'Save current view',
    saveViewTitle: 'Save view',
    viewName: 'View name',
    save: 'Save',
    cancel: 'Cancel',
    import: 'Import CSV',
    export: 'Export CSV',
    files: 'File actions',
    saveFailed: 'Could not save this view.',
  },
  es: {
    more: 'Más',
    views: 'Vistas',
    allOpenLeads: 'Todos los prospectos abiertos',
    saveView: 'Guardar vista actual',
    saveViewTitle: 'Guardar vista',
    viewName: 'Nombre de la vista',
    save: 'Guardar',
    cancel: 'Cancelar',
    import: 'Importar CSV',
    export: 'Exportar CSV',
    files: 'Archivos',
    saveFailed: 'No se pudo guardar esta vista.',
  },
}
