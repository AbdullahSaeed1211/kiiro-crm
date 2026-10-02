import type { Locale } from './locale'

export interface ImportMappingCopy {
  readonly title: string
  readonly hint: string
  readonly fileColumn: string
  readonly meansColumn: string
  readonly keep: string
  readonly skip: string
  readonly columns: Readonly<Record<string, string>>
}

export const IMPORT_MAPPING_COPY: Readonly<Record<Locale, ImportMappingCopy>> = {
  en: {
    title: 'Match the columns',
    hint: 'We matched your file columns to our fields. Change any that are wrong.',
    fileColumn: 'Column in your file',
    meansColumn: 'Goes into',
    keep: 'Keep the file name (for custom fields)',
    skip: 'Do not import',
    columns: {
      name: 'Name',
      title: 'Title',
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
      organization: 'Organization',
      companyName: 'Company name',
      source: 'Source',
      value: 'Value',
      currency: 'Currency',
      stage: 'Stage',
      expectedClose: 'Expected close date',
    },
  },
  es: {
    title: 'Relaciona las columnas',
    hint: 'Relacionamos las columnas de tu archivo con nuestros campos. Cambia las que estén mal.',
    fileColumn: 'Columna en tu archivo',
    meansColumn: 'Va en',
    keep: 'Mantener el nombre del archivo (para campos personalizados)',
    skip: 'No importar',
    columns: {
      name: 'Nombre',
      title: 'Título',
      firstName: 'Nombre de pila',
      lastName: 'Apellido',
      email: 'Correo',
      phone: 'Teléfono',
      website: 'Sitio web',
      organization: 'Organización',
      companyName: 'Nombre de la empresa',
      source: 'Origen',
      value: 'Valor',
      currency: 'Moneda',
      stage: 'Etapa',
      expectedClose: 'Fecha de cierre prevista',
    },
  },
}
