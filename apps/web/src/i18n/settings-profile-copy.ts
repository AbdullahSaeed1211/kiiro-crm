import type { Locale } from './locale'

const en = {
  'Two-step sign-in is on. Save these recovery codes now.': 'Two-step sign-in is on. Save these recovery codes now.',
  'Each works once if you lose your phone. They are not shown again; store them somewhere safe.':
    'Each works once if you lose your phone. They are not shown again; store them somewhere safe.',
  'I saved them': 'I saved them',
  'Setup key': 'Setup key',
  '6-digit code from the app': '6-digit code from the app',
  'Turn on': 'Turn on',
  'Set up two-step sign-in': 'Set up two-step sign-in',
  Code: 'Code',
  'Two-step sign-in is on. To turn it off, enter a code from your app or a recovery code.':
    'Two-step sign-in is on. To turn it off, enter a code from your app or a recovery code.',
  'Turned off.': 'Turned off.',
  'Turn off': 'Turn off',
  'Copy your token now. It is not shown again.': 'Copy your token now. It is not shown again.',
  'New API token': 'New API token',
  'Send it as': 'Send it as',
  Made: 'Made',
  'last used': 'last used',
  'New token label': 'New token label',
  'Name, for example Zapier': 'Name, for example Zapier',
  'Make a token': 'Make a token',
  'Revoked.': 'Revoked.',
  'Calendar feed address': 'Calendar feed address',
  'Add it in your calendar app as a subscription by address (Google Calendar: Other calendars, From URL). Anyone with the address can read your due dates, so keep it private and make a new one if it leaks.':
    'Add it in your calendar app as a subscription by address (Google Calendar: Other calendars, From URL). Anyone with the address can read your due dates, so keep it private and make a new one if it leaks.',
  'Your feed is on. Its address is shown only when made; make a new one to see it again (the old one stops working).':
    'Your feed is on. Its address is shown only when made; make a new one to see it again (the old one stops working).',
  'Feed turned off.': 'Feed turned off.',
  'Make a new address': 'Make a new address',
  'Turn on calendar feed': 'Turn on calendar feed',
  'Two-step sign-in': 'Two-step sign-in',
  'Ask for a code from an authenticator app after your password, so a stolen password is not enough.':
    'Ask for a code from an authenticator app after your password, so a stolen password is not enough.',
  'Calendar feed': 'Calendar feed',
  'See your task due dates and lead follow-ups in Google, Apple or Outlook Calendar.':
    'See your task due dates and lead follow-ups in Google, Apple or Outlook Calendar.',
  'API access': 'API access',
  "Personal tokens let scripts and tools such as Zapier, Make or n8n use this workspace's API as you.":
    "Personal tokens let scripts and tools such as Zapier, Make or n8n use this workspace's API as you.",
  'Rotate your password without leaving your workspace.': 'Rotate your password without leaving your workspace.',
} satisfies Readonly<Record<string, string>>

const es = {
  'Two-step sign-in is on. Save these recovery codes now.':
    'La verificación en dos pasos está activada. Guarda estos códigos de recuperación ahora.',
  'Each works once if you lose your phone. They are not shown again; store them somewhere safe.':
    'Cada código sirve una vez si pierdes el teléfono. No volverán a mostrarse; guárdalos en un lugar seguro.',
  'I saved them': 'Ya los guardé',
  'Setup key': 'Clave de configuración',
  '6-digit code from the app': 'Código de 6 dígitos de la aplicación',
  'Turn on': 'Activar',
  'Set up two-step sign-in': 'Configurar verificación en dos pasos',
  Code: 'Código',
  'Two-step sign-in is on. To turn it off, enter a code from your app or a recovery code.':
    'La verificación en dos pasos está activada. Para desactivarla, introduce un código de la aplicación o uno de recuperación.',
  'Turned off.': 'Desactivada.',
  'Turn off': 'Desactivar',
  'Copy your token now. It is not shown again.': 'Copia el token ahora. No volverá a mostrarse.',
  'New API token': 'Nuevo token de API',
  'Send it as': 'Envíalo como',
  Made: 'Creado',
  'last used': 'último uso',
  'New token label': 'Nombre del nuevo token',
  'Name, for example Zapier': 'Nombre, por ejemplo Zapier',
  'Make a token': 'Crear token',
  'Revoked.': 'Revocado.',
  'Calendar feed address': 'Dirección del calendario',
  'Add it in your calendar app as a subscription by address (Google Calendar: Other calendars, From URL). Anyone with the address can read your due dates, so keep it private and make a new one if it leaks.':
    'Añádela como suscripción por dirección en tu aplicación de calendario (Google Calendar: Otros calendarios, Desde URL). Cualquiera que tenga la dirección podrá ver tus fechas; mantenla privada y crea otra si se filtra.',
  'Your feed is on. Its address is shown only when made; make a new one to see it again (the old one stops working).':
    'El calendario está activo. La dirección solo se muestra al crearla; crea otra para volver a verla (la anterior dejará de funcionar).',
  'Feed turned off.': 'Calendario desactivado.',
  'Make a new address': 'Crear otra dirección',
  'Turn on calendar feed': 'Activar calendario',
  'Two-step sign-in': 'Inicio de sesión en dos pasos',
  'Ask for a code from an authenticator app after your password, so a stolen password is not enough.':
    'Solicita un código de una aplicación de autenticación después de la contraseña, para que robarla no sea suficiente.',
  'Calendar feed': 'Calendario personal',
  'See your task due dates and lead follow-ups in Google, Apple or Outlook Calendar.':
    'Consulta las fechas de tareas y seguimientos de prospectos en Google Calendar, Apple Calendar u Outlook.',
  'API access': 'Acceso a la API',
  "Personal tokens let scripts and tools such as Zapier, Make or n8n use this workspace's API as you.":
    'Los tokens personales permiten que scripts y herramientas como Zapier, Make o n8n usen la API del espacio en tu nombre.',
  'Rotate your password without leaving your workspace.': 'Cambia tu contraseña sin salir de tu espacio de trabajo.',
} satisfies Readonly<Record<string, string>>

export const SETTINGS_PROFILE_COPY: Readonly<Record<Locale, Readonly<Record<string, string>>>> = { en, es }
