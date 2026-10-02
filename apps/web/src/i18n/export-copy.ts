import type { Locale } from './locale'

export interface ExportCopy {
  /** The link above a list that downloads every record you can see as a spreadsheet file. */
  readonly link: string
  readonly hint: string
}

export const EXPORT_COPY: Readonly<Record<Locale, ExportCopy>> = {
  en: { link: 'Export CSV', hint: 'Download every record you can see as a spreadsheet file' },
  es: { link: 'Exportar CSV', hint: 'Descargar todos los registros que puedes ver como hoja de cálculo' },
}
