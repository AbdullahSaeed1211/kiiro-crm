import type { Locale } from './locale'

export interface SettingsPageCopy {
  readonly titles: Readonly<Record<string, string>>
  readonly descriptions: Readonly<Record<string, string>>
  readonly noSettings: string
}

export const SETTINGS_PAGE_COPY: Readonly<Record<Locale, SettingsPageCopy>> = {
  en: {
    titles: {
      General: 'General',
      Branding: 'Branding',
      Modules: 'Modules',
      Terminology: 'Terminology',
      Members: 'Members',
      Groups: 'Groups',
      Workflows: 'Workflows',
      Fields: 'Fields',
      Playbooks: 'Playbooks',
      Views: 'Views',
      Lists: 'Lists',
      Notifications: 'Notifications',
      Email: 'Email',
      Newsletter: 'Newsletter',
      Sales: 'Sales',
      Intake: 'Intake',
      'Import & export': 'Import & export',
      Archive: 'Archive',
      Activity: 'Activity',
      Webhooks: 'Webhooks',
      Profile: 'Profile',
    },
    descriptions: {
      'Workspace defaults and regional preferences.': 'Workspace defaults and regional preferences.',
      'Invite teammates and review workspace access.': 'Invite teammates and review workspace access.',
      'Manage your personal details and password.': 'Manage your personal details and password.',
      'Give your workspace a recognizable look.': 'Give your workspace a recognizable look.',
      'Choose which workspace capabilities are available.': 'Choose which workspace capabilities are available.',
      'Use language that matches how your team works.': 'Use language that matches how your team works.',
      'Organize members into reusable teams.': 'Organize members into reusable teams.',
      'Customize the fields shown on your records.': 'Customize the fields shown on your records.',
      'Save shared list, board, calendar, and timeline configurations.':
        'Save shared list, board, calendar, and timeline configurations.',
      'The choices people pick from when working leads and deals.':
        'The choices people pick from when working leads and deals.',
      'Choose which workspace updates reach you and where they appear.':
        'Choose which workspace updates reach you and where they appear.',
      'Outbound sender identity is deployed with the Worker; inbound record-addressing can be changed here.':
        'Outbound sender identity is deployed with the Worker; inbound record-addressing can be changed here.',
      'Send one message to every contact who opted in. Each email carries an unsubscribe link.':
        'Send one message to every contact who opted in. Each email carries an unsubscribe link.',
      'How new leads are assigned, how fast they should be answered, and the emails you send most.':
        'How new leads are assigned, how fast they should be answered, and the emails you send most.',
      'Configure secure public lead forms, routing, email intake, and delivery review.':
        'Configure secure public lead forms, routing, email intake, and delivery review.',
      'Bring organizations, contacts, leads and deals in from a spreadsheet, or download everything as CSV.':
        'Bring organizations, contacts, leads and deals in from a spreadsheet, or download everything as CSV.',
      'Leads, deals, contacts, organizations, projects and tasks that were archived. Restore one to put it back in its lists.':
        'Leads, deals, contacts, organizations, projects and tasks that were archived. Restore one to put it back in its lists.',
      'Send an event to another system, such as Zapier, Make or your own software, whenever something happens to a record.':
        'Send an event to another system, such as Zapier, Make or your own software, whenever something happens to a record.',
      'Standard task lists for onboarding a new client.': 'Standard task lists for onboarding a new client.',
    },
    noSettings: 'No settings configured yet.',
  },
  es: {
    titles: {
      General: 'General',
      Branding: 'Marca',
      Modules: 'Módulos',
      Terminology: 'Terminología',
      Members: 'Miembros',
      Groups: 'Grupos',
      Workflows: 'Flujos',
      Fields: 'Campos',
      Playbooks: 'Guías de incorporación',
      Views: 'Vistas',
      Lists: 'Listas',
      Notifications: 'Notificaciones',
      Email: 'Correo',
      Newsletter: 'Boletín',
      Sales: 'Ventas',
      Intake: 'Captura',
      'Import & export': 'Importar y exportar',
      Archive: 'Archivo',
      Activity: 'Actividad',
      Webhooks: 'Webhooks',
      Profile: 'Perfil',
    },
    descriptions: {
      'Workspace defaults and regional preferences.': 'Valores predeterminados y preferencias regionales del espacio.',
      'Invite teammates and review workspace access.': 'Invita a compañeros y revisa el acceso al espacio.',
      'Manage your personal details and password.': 'Administra tus datos personales y contraseña.',
      'Give your workspace a recognizable look.': 'Dale a tu espacio una apariencia reconocible.',
      'Choose which workspace capabilities are available.': 'Elige qué funciones del espacio estarán disponibles.',
      'Use language that matches how your team works.': 'Usa términos que reflejen cómo trabaja tu equipo.',
      'Organize members into reusable teams.': 'Organiza a los miembros en equipos reutilizables.',
      'Customize the fields shown on your records.': 'Personaliza los campos que aparecen en tus registros.',
      'Save shared list, board, calendar, and timeline configurations.':
        'Guarda configuraciones compartidas de listas, tableros, calendarios y cronologías.',
      'The choices people pick from when working leads and deals.':
        'Las opciones que el equipo elige al trabajar con prospectos y oportunidades.',
      'Choose which workspace updates reach you and where they appear.':
        'Elige qué novedades del espacio recibes y dónde aparecen.',
      'Outbound sender identity is deployed with the Worker; inbound record-addressing can be changed here.':
        'La identidad de envío se publica con Worker; aquí puedes cambiar las direcciones entrantes de registros.',
      'Send one message to every contact who opted in. Each email carries an unsubscribe link.':
        'Envía un mensaje a cada contacto que aceptó recibirlos. Cada correo incluye un enlace para cancelar la suscripción.',
      'How new leads are assigned, how fast they should be answered, and the emails you send most.':
        'Cómo se asignan los prospectos, en cuánto tiempo responder y los correos que más envías.',
      'Configure secure public lead forms, routing, email intake, and delivery review.':
        'Configura formularios públicos seguros, asignación, recepción por correo y revisión de entregas.',
      'Bring organizations, contacts, leads and deals in from a spreadsheet, or download everything as CSV.':
        'Importa organizaciones, contactos, prospectos y oportunidades desde una hoja de cálculo o descarga todo como CSV.',
      'Leads, deals, contacts, organizations, projects and tasks that were archived. Restore one to put it back in its lists.':
        'Prospectos, oportunidades, contactos, organizaciones, proyectos y tareas archivados. Restaura uno para devolverlo a sus listas.',
      'Send an event to another system, such as Zapier, Make or your own software, whenever something happens to a record.':
        'Envía un evento a otro sistema, como Zapier, Make o tu propio software, cuando cambie un registro.',
      'Standard task lists for onboarding a new client.':
        'Listas de tareas estándar para incorporar a un cliente nuevo.',
    },
    noSettings: 'Aún no hay ajustes configurados.',
  },
}
