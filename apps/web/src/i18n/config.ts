export const SUPPORTED_LOCALES = ['en', 'es'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export function normalizeLocale(value: unknown): Locale {
  return value === 'es' ? 'es' : 'en'
}

export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  en: 'English',
  es: 'Español',
}

export const SHELL_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    dashboard: 'Dashboard', myTasks: 'My tasks', inbox: 'Inbox', leads: 'Leads', deals: 'Deals',
    organizations: 'Organizations', contacts: 'Contacts', projects: 'Projects', tasks: 'Tasks',
    calendar: 'Calendar', timeline: 'Timeline', crm: 'CRM', work: 'Work', settings: 'Settings',
  },
  es: {
    dashboard: 'Inicio', myTasks: 'Mis tareas', inbox: 'Bandeja de entrada', leads: 'Prospectos', deals: 'Oportunidades',
    organizations: 'Organizaciones', contacts: 'Contactos', projects: 'Proyectos', tasks: 'Tareas',
    calendar: 'Calendario', timeline: 'Cronología', crm: 'CRM', work: 'Trabajo', settings: 'Configuración',
  },
}

export const SETTINGS_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: { workspace: 'Workspace', people: 'People & access', work: 'Work configuration', communications: 'Communications', data: 'Data', personal: 'Personal' },
  es: { workspace: 'Espacio de trabajo', people: 'Personas y acceso', work: 'Configuración de trabajo', communications: 'Comunicaciones', data: 'Datos', personal: 'Personal' },
}

export const SETTINGS_ITEM_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: { general: 'General', branding: 'Branding', modules: 'Modules', terminology: 'Terminology', members: 'Members', groups: 'Groups', workflows: 'Workflows', fields: 'Fields', views: 'Views', notifications: 'Notifications', email: 'Email', intake: 'Intake', import: 'Import', profile: 'Profile' },
  es: { general: 'General', branding: 'Marca', modules: 'Módulos', terminology: 'Terminología', members: 'Miembros', groups: 'Grupos', workflows: 'Flujos', fields: 'Campos', views: 'Vistas', notifications: 'Notificaciones', email: 'Correo', intake: 'Captura', import: 'Importar', profile: 'Perfil' },
}
