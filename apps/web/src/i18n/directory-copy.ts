import type { Locale } from './locale'

/** Words on the contact and organization lists and forms. */
export interface DirectoryCopy {
  readonly organizationsTitle: string
  readonly contactsTitle: string
  readonly more: string
  readonly nextDueTask: string
  readonly unassigned: string
  readonly colName: string
  readonly colWebsite: string
  readonly colOwner: string
  readonly colOpenDeals: string
  readonly colUpdated: string
  readonly colOrganization: string
  readonly colEmail: string
  readonly colPhone: string
  readonly searchOrganizations: string
  readonly searchContacts: string
  readonly sortNameAsc: string
  readonly sortNameDesc: string
  readonly sortRecent: string
  readonly sortOldest: string
  readonly edit: string
  readonly newOrganization: string
  readonly editOrganization: string
  readonly newContact: string
  readonly editContact: string
  readonly introOrganization: string
  readonly introContact: string
  readonly organizationName: string
  readonly organizationNamePlaceholder: string
  readonly website: string
  readonly email: string
  readonly phone: string
  readonly firstName: string
  readonly firstNamePlaceholder: string
  readonly lastName: string
  readonly lastNamePlaceholder: string
  readonly organization: string
  readonly noOrganization: string
  readonly createOrganization: string
  readonly createContact: string
  readonly saveChanges: string
  readonly saving: string
  readonly cancel: string
  readonly required: string
  readonly invalidEmail: string
}

export const DIRECTORY_COPY: Readonly<Record<Locale, DirectoryCopy>> = {
  en: {
    organizationsTitle: 'Organizations',
    contactsTitle: 'Contacts',
    more: 'More',
    nextDueTask: 'Next due task',
    unassigned: 'Unassigned',
    colName: 'Name',
    colWebsite: 'Website',
    colOwner: 'Owner',
    colOpenDeals: 'Open deals',
    colUpdated: 'Updated',
    colOrganization: 'Organization',
    colEmail: 'Email',
    colPhone: 'Phone',
    searchOrganizations: 'Search organizations',
    searchContacts: 'Search contacts',
    sortNameAsc: 'Name: A to Z',
    sortNameDesc: 'Name: Z to A',
    sortRecent: 'Recently updated',
    sortOldest: 'Least recently updated',
    edit: 'Edit',
    newOrganization: 'New organization',
    editOrganization: 'Edit organization',
    newContact: 'New contact',
    editContact: 'Edit contact',
    introOrganization: 'Keep company details and relationships easy for the whole team to trust.',
    introContact: 'Add a person and connect them to the organization they represent.',
    organizationName: 'Organization name',
    organizationNamePlaceholder: 'e.g. Northstar Labs',
    website: 'Website',
    email: 'Email',
    phone: 'Phone',
    firstName: 'First name',
    firstNamePlaceholder: 'e.g. Ada',
    lastName: 'Last name',
    lastNamePlaceholder: 'e.g. Lovelace',
    organization: 'Organization',
    noOrganization: 'No organization',
    createOrganization: 'Create organization',
    createContact: 'Create contact',
    saveChanges: 'Save changes',
    saving: 'Saving…',
    cancel: 'Cancel',
    required: 'This field is required.',
    invalidEmail: 'Enter a valid email address.',
  },
  es: {
    organizationsTitle: 'Organizaciones',
    contactsTitle: 'Contactos',
    more: 'Más',
    nextDueTask: 'Próxima tarea pendiente',
    unassigned: 'Sin asignar',
    colName: 'Nombre',
    colWebsite: 'Sitio web',
    colOwner: 'Responsable',
    colOpenDeals: 'Oportunidades abiertas',
    colUpdated: 'Actualizado',
    colOrganization: 'Organización',
    colEmail: 'Correo',
    colPhone: 'Teléfono',
    searchOrganizations: 'Buscar organizaciones',
    searchContacts: 'Buscar contactos',
    sortNameAsc: 'Nombre: de A a Z',
    sortNameDesc: 'Nombre: de Z a A',
    sortRecent: 'Actualizados recientemente',
    sortOldest: 'Actualizados hace más tiempo',
    edit: 'Editar',
    newOrganization: 'Nueva organización',
    editOrganization: 'Editar organización',
    newContact: 'Nuevo contacto',
    editContact: 'Editar contacto',
    introOrganization: 'Mantén los datos y las relaciones de la empresa claros para todo el equipo.',
    introContact: 'Agrega a una persona y conéctala con la organización que representa.',
    organizationName: 'Nombre de la organización',
    organizationNamePlaceholder: 'p. ej. Northstar Labs',
    website: 'Sitio web',
    email: 'Correo',
    phone: 'Teléfono',
    firstName: 'Nombre',
    firstNamePlaceholder: 'p. ej. Ada',
    lastName: 'Apellido',
    lastNamePlaceholder: 'p. ej. Lovelace',
    organization: 'Organización',
    noOrganization: 'Sin organización',
    createOrganization: 'Crear organización',
    createContact: 'Crear contacto',
    saveChanges: 'Guardar cambios',
    saving: 'Guardando…',
    cancel: 'Cancelar',
    required: 'Este campo es obligatorio.',
    invalidEmail: 'Escribe un correo válido.',
  },
}
