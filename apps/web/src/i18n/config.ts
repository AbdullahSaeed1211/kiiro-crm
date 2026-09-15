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
    dashboard: 'Dashboard',
    myTasks: 'My tasks',
    inbox: 'Inbox',
    leads: 'Leads',
    deals: 'Deals',
    organizations: 'Organizations',
    contacts: 'Contacts',
    projects: 'Projects',
    tasks: 'Tasks',
    calendar: 'Calendar',
    timeline: 'Timeline',
    reports: 'Figures',
    crm: 'CRM',
    work: 'Work',
    settings: 'Settings',
  },
  es: {
    dashboard: 'Inicio',
    myTasks: 'Mis tareas',
    inbox: 'Bandeja de entrada',
    leads: 'Prospectos',
    deals: 'Oportunidades',
    organizations: 'Organizaciones',
    contacts: 'Contactos',
    projects: 'Proyectos',
    tasks: 'Tareas',
    calendar: 'Calendario',
    timeline: 'Cronología',
    reports: 'Indicadores',
    crm: 'CRM',
    work: 'Trabajo',
    settings: 'Configuración',
  },
}

export const SETTINGS_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    workspace: 'Workspace',
    people: 'People & access',
    work: 'Work configuration',
    communications: 'Communications',
    data: 'Data',
    personal: 'Personal',
  },
  es: {
    workspace: 'Espacio de trabajo',
    people: 'Personas y acceso',
    work: 'Configuración de trabajo',
    communications: 'Comunicaciones',
    data: 'Datos',
    personal: 'Personal',
  },
}

export const SETTINGS_ITEM_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    general: 'General',
    branding: 'Branding',
    modules: 'Modules',
    terminology: 'Terminology',
    members: 'Members',
    groups: 'Groups',
    workflows: 'Workflows',
    fields: 'Fields',
    views: 'Views',
    notifications: 'Notifications',
    email: 'Email',
    intake: 'Intake',
    import: 'Import',
    profile: 'Profile',
  },
  es: {
    general: 'General',
    branding: 'Marca',
    modules: 'Módulos',
    terminology: 'Terminología',
    members: 'Miembros',
    groups: 'Grupos',
    workflows: 'Flujos',
    fields: 'Campos',
    views: 'Vistas',
    notifications: 'Notificaciones',
    email: 'Correo',
    intake: 'Captura',
    import: 'Importar',
    profile: 'Perfil',
  },
}

export const SEARCH_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    button: 'Search workspace',
    title: 'Search workspace',
    description: 'Find customer and work records.',
    placeholder: 'Search people, deals, projects, tasks…',
    searching: 'Searching…',
    minChars: 'Type at least two characters.',
    noMatches: 'No matching records.',
    navigate: 'Navigate',
    create: 'Create',
    records: 'Records',
    newLead: 'New lead',
    newContact: 'New contact',
    newOrganization: 'New organization',
    enter: '↵',
  },
  es: {
    button: 'Buscar en el espacio',
    title: 'Buscar en el espacio',
    description: 'Encuentra registros de clientes y trabajo.',
    placeholder: 'Buscar personas, oportunidades, proyectos, tareas…',
    searching: 'Buscando…',
    minChars: 'Escribe al menos dos caracteres.',
    noMatches: 'No hay coincidencias.',
    navigate: 'Navegar',
    create: 'Crear',
    records: 'Registros',
    newLead: 'Nuevo prospecto',
    newContact: 'Nuevo contacto',
    newOrganization: 'Nueva organización',
    enter: '↵',
  },
}

export const NOTIFICATION_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    label: 'Notifications',
    description: 'Updates that need your attention.',
    loading: 'Loading updates…',
    caughtUp: 'You’re all caught up.',
  },
  es: {
    label: 'Notificaciones',
    description: 'Novedades que requieren tu atención.',
    loading: 'Cargando novedades…',
    caughtUp: 'Estás al día.',
  },
}

export const DASHBOARD_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    title: 'Dashboard',
    description: '{mine} open tasks assigned to you · {open} across the workspace',
    newTask: 'New task',
    newLead: 'New lead',
    myOpenTasks: 'My open tasks',
    assignedToYou: 'Assigned to you',
    openLeads: 'Open leads',
    needsFollowUp: 'Needs follow-up',
    openDeals: 'Open deals',
    activePipeline: 'Active pipeline',
    contacts: 'Contacts',
    organizations: '{count} organizations',
    myOverdue: 'My overdue',
    dueThisWeek: 'Due this week',
    activeProjects: 'Active projects',
    viewAll: 'View all',
    nothingOverdue: 'Nothing overdue',
    onTrack: 'Your open work is on track.',
    noTasksDue: 'No tasks due',
    noTasksDueDescription: 'There is no open work due in the next seven days.',
    noActiveProjects: 'No active projects',
    noActiveProjectsDescription: 'Create a project when work is ready to organize.',
    figures: 'Team figures',
    figuresDescription: 'Owner and manager reporting',
  },
  es: {
    title: 'Inicio',
    description: '{mine} tareas abiertas asignadas a ti · {open} en el espacio',
    newTask: 'Nueva tarea',
    newLead: 'Nuevo prospecto',
    myOpenTasks: 'Mis tareas abiertas',
    assignedToYou: 'Asignadas a ti',
    openLeads: 'Prospectos abiertos',
    needsFollowUp: 'Requieren seguimiento',
    openDeals: 'Oportunidades abiertas',
    activePipeline: 'Pipeline activo',
    contacts: 'Contactos',
    organizations: '{count} organizaciones',
    myOverdue: 'Mis vencidas',
    dueThisWeek: 'Vencen esta semana',
    activeProjects: 'Proyectos activos',
    viewAll: 'Ver todo',
    nothingOverdue: 'Nada vencido',
    onTrack: 'Tu trabajo abierto está al día.',
    noTasksDue: 'No hay tareas próximas',
    noTasksDueDescription: 'No hay trabajo abierto para los próximos siete días.',
    noActiveProjects: 'No hay proyectos activos',
    noActiveProjectsDescription: 'Crea un proyecto cuando el trabajo esté listo para organizarse.',
    figures: 'Indicadores del equipo',
    figuresDescription: 'Informes para propietarios y gerentes',
  },
}

export { TASK_COPY, REPORT_COPY } from './work-copy'
