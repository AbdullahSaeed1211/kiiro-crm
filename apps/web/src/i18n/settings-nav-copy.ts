import type { Locale } from './locale'

export interface SettingsNavCopy {
  readonly settings: string
  readonly common: string
  readonly advanced: string
  readonly profile: string
  readonly general: string
  readonly members: string
  readonly notifications: string
  readonly allSettings: string
  readonly groupLabels: Readonly<Record<string, string>>
  readonly items: Readonly<Record<string, string>>
}

export const SETTINGS_NAV_COPY: Readonly<Record<Locale, SettingsNavCopy>> = {
  en: {
    settings: 'Settings',
    common: 'Common',
    advanced: 'All settings',
    profile: 'Profile',
    general: 'General',
    members: 'Members',
    notifications: 'Notifications',
    allSettings: 'Browse all settings',
    groupLabels: {
      workspace: 'Workspace',
      people: 'People & access',
      work: 'Work configuration',
      communications: 'Communications',
      data: 'Data',
      personal: 'Personal',
    },
    items: {
      general: 'General',
      members: 'Members',
      profile: 'Profile',
      notifications: 'Notifications',
      branding: 'Branding',
      modules: 'Modules',
      terminology: 'Terminology',
      groups: 'Groups',
      workflows: 'Workflows',
      fields: 'Fields',
      playbooks: 'Playbooks',
      views: 'Views',
      lists: 'Lists',
      email: 'Email',
      newsletter: 'Newsletter',
      sales: 'Sales',
      intake: 'Intake',
      import: 'Import & export',
      archive: 'Archive',
      activity: 'Activity',
      webhooks: 'Webhooks',
    },
  },
  es: {
    settings: 'Configuración',
    common: 'Frecuentes',
    advanced: 'Todos los ajustes',
    profile: 'Perfil',
    general: 'General',
    members: 'Miembros',
    notifications: 'Notificaciones',
    allSettings: 'Ver todos los ajustes',
    groupLabels: {
      workspace: 'Espacio de trabajo',
      people: 'Personas y acceso',
      work: 'Configuración de trabajo',
      communications: 'Comunicaciones',
      data: 'Datos',
      personal: 'Personal',
    },
    items: {
      general: 'General',
      members: 'Miembros',
      profile: 'Perfil',
      notifications: 'Notificaciones',
      branding: 'Marca',
      modules: 'Módulos',
      terminology: 'Terminología',
      groups: 'Grupos',
      workflows: 'Flujos',
      fields: 'Campos',
      playbooks: 'Guías de incorporación',
      views: 'Vistas',
      lists: 'Listas',
      email: 'Correo',
      newsletter: 'Boletín',
      sales: 'Ventas',
      intake: 'Captura',
      import: 'Importar y exportar',
      archive: 'Archivo',
      activity: 'Actividad',
      webhooks: 'Webhooks',
    },
  },
}
