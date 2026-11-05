import type { ActionKind, ConditionField, ConditionOp, TaskAssignee, TriggerKind } from '@ops/module-automation'
import type { Locale } from './locale'

/** Settings, Automation: the rules editor and the run history. */
export interface AutomationCopy {
  readonly pageTitle: string
  readonly pageDescription: string
  readonly rulesTitle: string
  readonly rulesHelp: string
  readonly emptyRules: string
  readonly ruleName: string
  readonly enabled: string
  readonly trigger: string
  readonly noReplyDays: string
  readonly conditionsTitle: string
  readonly conditionsHelp: string
  readonly addCondition: string
  readonly removeCondition: string
  readonly field: string
  readonly op: string
  readonly value: string
  readonly chooseValue: string
  readonly actionsTitle: string
  readonly actionsHelp: string
  readonly addAction: string
  readonly removeAction: string
  readonly taskTitle: string
  readonly dueInDays: string
  readonly assignee: string
  readonly person: string
  readonly addRule: string
  readonly removeRule: string
  readonly save: string
  readonly saved: string
  readonly triggers: Readonly<Record<TriggerKind, string>>
  readonly fields: Readonly<Record<ConditionField, string>>
  readonly ops: Readonly<Record<ConditionOp, string>>
  readonly actions: Readonly<Record<ActionKind, string>>
  readonly assignees: Readonly<Record<TaskAssignee, string>>
  readonly stageGroups: Readonly<{ lead: string; deal: string }>
  readonly historyTitle: string
  readonly historyHelp: string
  readonly emptyHistory: string
  readonly time: string
  readonly rule: string
  readonly record: string
  readonly status: string
  readonly result: string
  readonly statuses: Readonly<Record<'running' | 'done' | 'failed', string>>
  readonly openRecord: string
  readonly failed: string
  readonly noActions: string
  readonly unknownAction: string
  readonly recordTypes: Readonly<Record<string, string>>
}

export const AUTOMATION_COPY: Readonly<Record<Locale, AutomationCopy>> = {
  en: {
    pageTitle: 'Automation',
    pageDescription:
      'Run simple rules when leads, deals and tasks change. Rules run every 15 minutes, and each rule acts once on each record.',
    rulesTitle: 'Rules',
    rulesHelp:
      'A rule checks records when its trigger happens. Every condition must match before its actions run, in order.',
    emptyRules: 'No rules yet. Add one below.',
    ruleName: 'Rule name',
    enabled: 'Enabled',
    trigger: 'Trigger',
    noReplyDays: 'Days without a reply',
    conditionsTitle: 'Conditions',
    conditionsHelp: 'All conditions must match. Leave the list empty to match every record for the trigger.',
    addCondition: 'Add condition',
    removeCondition: 'Remove condition',
    field: 'Field',
    op: 'Comparison',
    value: 'Value',
    chooseValue: 'Choose one',
    actionsTitle: 'Actions',
    actionsHelp: 'Actions run in order. A failed action does not stop the others.',
    addAction: 'Add action',
    removeAction: 'Remove action',
    taskTitle: 'Task title',
    dueInDays: 'Due in days',
    assignee: 'Assign to',
    person: 'Person',
    addRule: 'Add rule',
    removeRule: 'Remove rule',
    save: 'Save rules',
    saved: 'Saved.',
    triggers: {
      'lead.created': 'A lead is created',
      'lead.no_reply': 'A lead has no reply',
      'deal.stage_changed': 'A deal changes stage',
      'deal.won': 'A deal is won',
      'deal.lost': 'A deal is lost',
      'task.overdue': 'A task is overdue',
    },
    fields: { source: 'Source', owner: 'Owner', stage: 'Stage', value: 'Value' },
    ops: { is: 'is', is_not: 'is not', gte: 'is at least', lte: 'is at most' },
    actions: { create_task: 'Create task', assign_owner: 'Assign owner', notify: 'Notify' },
    assignees: { record_owner: 'Record owner', me: 'Me' },
    stageGroups: { lead: 'Lead stages', deal: 'Deal stages' },
    historyTitle: 'Run history',
    historyHelp: 'The latest rule runs, newest first.',
    emptyHistory: 'No rules have run yet.',
    time: 'Time',
    rule: 'Rule',
    record: 'Record',
    status: 'Status',
    result: 'Result',
    statuses: { running: 'Running', done: 'Done', failed: 'Failed' },
    openRecord: 'Open record',
    failed: 'Failed',
    noActions: 'No actions recorded.',
    unknownAction: 'Action',
    recordTypes: { lead: 'Lead', deal: 'Deal', task: 'Task' },
  },
  es: {
    pageTitle: 'Automatización',
    pageDescription:
      'Ejecuta reglas simples cuando cambian los prospectos, las oportunidades y las tareas. Las reglas se ejecutan cada 15 minutos y cada regla actúa una vez por registro.',
    rulesTitle: 'Reglas',
    rulesHelp:
      'Una regla revisa los registros cuando ocurre su disparador. Todas las condiciones deben cumplirse antes de ejecutar sus acciones, en orden.',
    emptyRules: 'Aún no hay reglas. Agrega una abajo.',
    ruleName: 'Nombre de la regla',
    enabled: 'Activa',
    trigger: 'Disparador',
    noReplyDays: 'Días sin respuesta',
    conditionsTitle: 'Condiciones',
    conditionsHelp:
      'Todas las condiciones deben cumplirse. Deja la lista vacía para aplicar a todos los registros del disparador.',
    addCondition: 'Agregar condición',
    removeCondition: 'Quitar condición',
    field: 'Campo',
    op: 'Comparación',
    value: 'Valor',
    chooseValue: 'Elige una opción',
    actionsTitle: 'Acciones',
    actionsHelp: 'Las acciones se ejecutan en orden. Una acción fallida no detiene las demás.',
    addAction: 'Agregar acción',
    removeAction: 'Quitar acción',
    taskTitle: 'Título de la tarea',
    dueInDays: 'Vence en días',
    assignee: 'Asignar a',
    person: 'Persona',
    addRule: 'Agregar regla',
    removeRule: 'Quitar regla',
    save: 'Guardar reglas',
    saved: 'Guardado.',
    triggers: {
      'lead.created': 'Se crea un prospecto',
      'lead.no_reply': 'Un prospecto no tiene respuesta',
      'deal.stage_changed': 'Una oportunidad cambia de etapa',
      'deal.won': 'Se gana una oportunidad',
      'deal.lost': 'Se pierde una oportunidad',
      'task.overdue': 'Una tarea está atrasada',
    },
    fields: { source: 'Origen', owner: 'Responsable', stage: 'Etapa', value: 'Valor' },
    ops: { is: 'es', is_not: 'no es', gte: 'es al menos', lte: 'es como máximo' },
    actions: { create_task: 'Crear tarea', assign_owner: 'Asignar responsable', notify: 'Notificar' },
    assignees: { record_owner: 'Responsable del registro', me: 'Yo' },
    stageGroups: { lead: 'Etapas de prospectos', deal: 'Etapas de oportunidades' },
    historyTitle: 'Historial de ejecuciones',
    historyHelp: 'Las últimas ejecuciones de reglas, las más nuevas primero.',
    emptyHistory: 'Aún no se ha ejecutado ninguna regla.',
    time: 'Hora',
    rule: 'Regla',
    record: 'Registro',
    status: 'Estado',
    result: 'Resultado',
    statuses: { running: 'En curso', done: 'Completada', failed: 'Fallida' },
    openRecord: 'Abrir registro',
    failed: 'Falló',
    noActions: 'No se registraron acciones.',
    unknownAction: 'Acción',
    recordTypes: { lead: 'Prospecto', deal: 'Oportunidad', task: 'Tarea' },
  },
}
