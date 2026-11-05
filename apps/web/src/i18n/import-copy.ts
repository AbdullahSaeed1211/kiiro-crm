import type { Locale } from './locale'

/** Settings, Import & export. `{n}` placeholders are numbers, `{name}` a record type, `{list}` a column list. */
export interface ImportCopy {
  readonly steps: readonly [string, string, string]
  readonly template: string
  readonly exportTitle: string
  readonly exportHelp: string
  /** Record type names by type, plural. */
  readonly types: Readonly<Record<string, string>>
  readonly typeSingular: Readonly<Record<string, string>>
  readonly importLabel: string
  readonly fileLabel: string
  readonly check: string
  readonly import: string
  readonly tooBig: string
  readonly failed: string
  readonly checkDone: string
  readonly importDone: string
  readonly summary: string
  readonly canBeCreated: string
  readonly created: string
  readonly newOrgsWould: string
  readonly newOrgsDid: string
  readonly problemsHint: string
  readonly ignored: string
  readonly row: string
  readonly more: string
}

export const IMPORT_COPY: Readonly<Record<Locale, ImportCopy>> = {
  en: {
    steps: [
      'Download the template for what you are importing and fill it in (CSV, up to 5 MB and 500 rows).',
      'Choose the file and press Check file. Nothing is saved; every row is checked and problems are listed.',
      'When the check looks right, press Import. People, companies and deals that already exist are skipped.',
    ],
    template: '{name} template',
    exportTitle: 'Export',
    exportHelp:
      'Download every record you can see, with your custom fields, as a CSV that opens in any spreadsheet. The organization, contact, lead and deal files can be imported again.',
    types: { organization: 'Organizations', contact: 'Contacts', lead: 'Leads', deal: 'Deals' },
    typeSingular: { organization: 'Organization', contact: 'Contact', lead: 'Lead' },
    importLabel: 'Import',
    fileLabel: 'CSV file',
    check: 'Check file',
    import: 'Import',
    tooBig: 'The file is larger than 5 MB.',
    failed: 'Unable to import. Try again.',
    checkDone: 'Check complete, nothing was imported yet.',
    importDone: 'Import complete.',
    summary:
      '{lead} {total} rows read: {created} {createdWord}, {skipped} skipped as already existing, {errors} with problems.',
    canBeCreated: 'can be created',
    created: 'created',
    newOrgsWould: '{n} new organizations would be added.',
    newOrgsDid: '{n} new organizations were added.',
    problemsHint: 'The import skips rows with problems. Fix the file and check it again to include them.',
    ignored: 'Columns not recognised and left out: {list}.',
    row: 'Row {n}:',
    more: '…and {n} more.',
  },
  es: {
    steps: [
      'Descarga la plantilla de lo que vas a importar y complétala (CSV, hasta 5 MB y 500 filas).',
      'Elige el archivo y pulsa Revisar archivo. No se guarda nada; se revisa cada fila y se listan los problemas.',
      'Cuando la revisión se vea bien, pulsa Importar. Las personas, empresas y oportunidades que ya existen se omiten.',
    ],
    template: 'Plantilla de {name}',
    exportTitle: 'Exportar',
    exportHelp:
      'Descarga todos los registros que puedes ver, con tus campos personalizados, como un CSV que abre cualquier hoja de cálculo. Los archivos de organizaciones, contactos, prospectos y oportunidades se pueden volver a importar.',
    types: { organization: 'Organizaciones', contact: 'Contactos', lead: 'Prospectos', deal: 'Oportunidades' },
    typeSingular: { organization: 'Organización', contact: 'Contacto', lead: 'Prospecto' },
    importLabel: 'Importar',
    fileLabel: 'Archivo CSV',
    check: 'Revisar archivo',
    import: 'Importar',
    tooBig: 'El archivo supera los 5 MB.',
    failed: 'No se pudo importar. Inténtalo de nuevo.',
    checkDone: 'Revisión completa, todavía no se importó nada.',
    importDone: 'Importación completa.',
    summary:
      '{lead} {total} filas leídas: {created} {createdWord}, {skipped} omitidas por ya existir, {errors} con problemas.',
    canBeCreated: 'se pueden crear',
    created: 'creadas',
    newOrgsWould: 'Se agregarían {n} organizaciones nuevas.',
    newOrgsDid: 'Se agregaron {n} organizaciones nuevas.',
    problemsHint:
      'La importación omite las filas con problemas. Corrige el archivo y revísalo de nuevo para incluirlas.',
    ignored: 'Columnas no reconocidas y omitidas: {list}.',
    row: 'Fila {n}:',
    more: '…y {n} más.',
  },
}
