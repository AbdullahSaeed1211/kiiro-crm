import type { Locale } from './locale'

/** Settings, Sales: response target, lead assignment rules and email templates. `{name}` is a source name. */
export interface SalesSettingsCopy {
  readonly saved: string
  readonly save: string
  readonly response: {
    readonly title: string
    readonly help: string
    readonly hoursAria: string
    readonly hours: string
  }
  readonly rules: {
    readonly title: string
    readonly help: string
    readonly nameLabel: string
    readonly sourceLabel: string
    readonly everyLead: string
    readonly onlyFrom: string
    readonly ownersLabel: string
    readonly remove: string
    readonly add: string
    readonly save: string
  }
  readonly templates: {
    readonly title: string
    readonly help: string
    readonly nameLabel: string
    readonly subjectLabel: string
    readonly messageLabel: string
    readonly messagePlaceholder: string
    readonly remove: string
    readonly add: string
    readonly save: string
  }
}

export const SALES_SETTINGS_COPY: Readonly<Record<Locale, SalesSettingsCopy>> = {
  en: {
    saved: 'Saved.',
    save: 'Save',
    response: {
      title: 'First response target',
      help: 'A new lead that is still in the first pipeline stage after this many hours is marked "Response overdue". Use 0 to turn the marker off.',
      hoursAria: 'Hours',
      hours: 'hours',
    },
    rules: {
      title: 'Lead assignment',
      help: 'A new lead with no owner goes to the next person in the rule that matches its source. A rule for one source wins over the "every new lead" rule. An owner chosen on the lead is never changed.',
      nameLabel: 'Rule name',
      sourceLabel: 'Lead source',
      everyLead: 'Every new lead',
      onlyFrom: 'Only leads from {name}',
      ownersLabel: 'Give the leads to (in turn)',
      remove: 'Remove rule',
      add: 'Add rule',
      save: 'Save rules',
    },
    templates: {
      title: 'Email templates',
      help: "Write common messages once. {{firstName}} becomes the recipient's first name.",
      nameLabel: 'Template name',
      subjectLabel: 'Subject',
      messageLabel: 'Message',
      messagePlaceholder: "Message. Use {{firstName}} for the person's first name.",
      remove: 'Remove template',
      add: 'Add template',
      save: 'Save templates',
    },
  },
  es: {
    saved: 'Guardado.',
    save: 'Guardar',
    response: {
      title: 'Objetivo de primera respuesta',
      help: 'Un lead nuevo que sigue en la primera etapa del embudo después de estas horas se marca como "Respuesta atrasada". Usa 0 para desactivar la marca.',
      hoursAria: 'Horas',
      hours: 'horas',
    },
    rules: {
      title: 'Asignación de leads',
      help: 'Un lead nuevo sin responsable pasa a la siguiente persona de la regla que coincide con su origen. Una regla para un origen tiene prioridad sobre la regla "todo lead nuevo". Nunca se cambia un responsable elegido en el lead.',
      nameLabel: 'Nombre de la regla',
      sourceLabel: 'Origen del lead',
      everyLead: 'Todo lead nuevo',
      onlyFrom: 'Solo leads de {name}',
      ownersLabel: 'Asignar los leads a (por turnos)',
      remove: 'Quitar regla',
      add: 'Agregar regla',
      save: 'Guardar reglas',
    },
    templates: {
      title: 'Plantillas de correo',
      help: 'Escribe los mensajes comunes una sola vez. {{firstName}} se convierte en el nombre de pila del destinatario.',
      nameLabel: 'Nombre de la plantilla',
      subjectLabel: 'Asunto',
      messageLabel: 'Mensaje',
      messagePlaceholder: 'Mensaje. Usa {{firstName}} para el nombre de pila de la persona.',
      remove: 'Quitar plantilla',
      add: 'Agregar plantilla',
      save: 'Guardar plantillas',
    },
  },
}
