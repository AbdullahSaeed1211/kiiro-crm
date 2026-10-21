import type { Locale } from './locale'

const en = {
  'Work area': 'Work area',
  Sales: 'Sales',
  Delivery: 'Delivery',
  Consultant: 'Consultant',
  Admin: 'Admin',
} satisfies Readonly<Record<string, string>>

const es = {
  'Work area': 'Área de trabajo',
  Sales: 'Ventas',
  Delivery: 'Entrega',
  Consultant: 'Consultoría',
  Admin: 'Administración',
} satisfies Readonly<Record<string, string>>

export const SETTINGS_MEMBER_COPY: Readonly<Record<Locale, Readonly<Partial<Record<string, string>>>>> = { en, es }
