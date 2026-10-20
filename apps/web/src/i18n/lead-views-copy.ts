import type { Locale } from './locale'

export interface LeadViewsCopy {
  readonly table: string
  readonly board: string
  readonly followUps: string
  readonly label: string
}

export const LEAD_VIEWS_COPY: Readonly<Record<Locale, LeadViewsCopy>> = {
  en: { table: 'Table', board: 'Board', followUps: 'Follow-ups', label: 'Lead views' },
  es: { table: 'Tabla', board: 'Tablero', followUps: 'Seguimientos', label: 'Vistas de prospectos' },
}
