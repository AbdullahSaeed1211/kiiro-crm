import type { StageCategory, StageColor } from '@ops/platform'

export const TEMPLATE_KEYS = [
  'blank',
  'agency',
  'accounting',
  'education',
  'health',
  'home-inspection',
  'legal',
  'real-estate',
  'travel',
] as const

export type TemplateKey = (typeof TEMPLATE_KEYS)[number]
export const TEMPLATE_LABELS: Readonly<Record<TemplateKey, string>> = {
  blank: 'General business',
  agency: 'Agency & services',
  accounting: 'Accounting',
  education: 'Education',
  health: 'Healthcare',
  'home-inspection': 'Home inspection',
  legal: 'Legal',
  'real-estate': 'Real estate',
  travel: 'Travel',
}
export type TemplateFieldType = 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'select' | 'multiSelect'
export type TemplateRecordType = 'organization' | 'contact' | 'lead' | 'deal' | 'project' | 'task'

export interface TemplateStage {
  readonly name: string
  readonly category: StageCategory
  readonly color: StageColor
  readonly probability?: number
}

export interface TemplateWorkflow {
  readonly recordType: TemplateRecordType
  readonly name: string
  readonly stages: readonly TemplateStage[]
}

export interface TemplateField {
  readonly recordType: TemplateRecordType
  readonly key: string
  readonly label: string
  readonly type: TemplateFieldType
  readonly options?: readonly string[]
  readonly sensitive?: boolean
}

export interface TemplateView {
  readonly recordType: TemplateRecordType
  readonly name: string
  readonly kind: 'table' | 'board' | 'calendar' | 'timeline'
  readonly sort: Readonly<Record<string, unknown>>
  readonly columns: readonly string[]
}

export interface VerticalTemplate {
  readonly key: TemplateKey
  readonly version: 1
  readonly terminology: Readonly<Record<string, string>>
  readonly modules: Readonly<Record<'crm' | 'work' | 'intake' | 'mail', boolean>>
  readonly sensitive: boolean
  readonly workflows: readonly TemplateWorkflow[]
  readonly fields: readonly TemplateField[]
  readonly views: readonly TemplateView[]
}

const MODULES = { crm: true, work: true, intake: true, mail: true } as const
const PROJECT_STAGES: readonly TemplateStage[] = [
  { name: 'Planned', category: 'backlog', color: 'gray' },
  { name: 'In progress', category: 'active', color: 'blue' },
  { name: 'On hold', category: 'waiting', color: 'amber' },
  { name: 'Delivered', category: 'done_success', color: 'green' },
  { name: 'Cancelled', category: 'cancelled', color: 'gray' },
]
const TASK_STAGES: readonly TemplateStage[] = [
  { name: 'Backlog', category: 'backlog', color: 'gray' },
  { name: 'To do', category: 'open', color: 'blue' },
  { name: 'In progress', category: 'active', color: 'amber' },
  { name: 'Review', category: 'waiting', color: 'violet' },
  { name: 'Done', category: 'done_success', color: 'green' },
]
const GENERIC_LEAD_STAGES: readonly TemplateStage[] = [
  { name: 'New', category: 'open', color: 'blue' },
  { name: 'Contacted', category: 'active', color: 'amber' },
  { name: 'Qualified', category: 'active', color: 'violet' },
  { name: 'Converted', category: 'done_success', color: 'green' },
  { name: 'Disqualified', category: 'done_failure', color: 'red' },
]
const GENERIC_DEAL_STAGES: readonly TemplateStage[] = [
  { name: 'Discovery', category: 'active', color: 'blue', probability: 10 },
  { name: 'Proposal', category: 'waiting', color: 'amber', probability: 50 },
  { name: 'Won', category: 'done_success', color: 'green', probability: 100 },
  { name: 'Lost', category: 'done_failure', color: 'red', probability: 0 },
]

function workflow(recordType: TemplateRecordType, name: string, stages: readonly TemplateStage[]): TemplateWorkflow {
  return { recordType, name, stages }
}

// eslint-disable-next-line max-params -- a view declaration is intentionally explicit and declarative.
function view(
  recordType: TemplateRecordType,
  name: string,
  kind: TemplateView['kind'],
  columns: readonly string[],
  sort: Readonly<Record<string, unknown>> = { key: 'updatedAt', desc: true },
): TemplateView {
  return { recordType, name, kind, sort, columns }
}

// eslint-disable-next-line max-params -- the declarative template builder keeps defaults easy to audit.
function baseTemplate(
  key: TemplateKey,
  terminology: Readonly<Record<string, string>>,
  workflows: readonly TemplateWorkflow[],
  fields: readonly TemplateField[] = [],
  sensitive = false,
): VerticalTemplate {
  return {
    key,
    version: 1,
    terminology,
    modules: MODULES,
    sensitive,
    workflows: [...workflows, workflow('project', 'Projects', PROJECT_STAGES), workflow('task', 'Tasks', TASK_STAGES)],
    fields,
    views: [
      view('lead', 'Open leads', 'table', ['title', 'stage', 'owner', 'source']),
      view('deal', 'Deal pipeline', 'board', ['title', 'stage', 'owner', 'value']),
      view('project', 'Projects', 'board', ['name', 'stage', 'owner']),
      view('task', 'Team tasks', 'table', ['title', 'stage', 'priority', 'assignees', 'dueAt'], { key: 'dueAt', desc: false }),
    ],
  }
}

const AGENCY_FIELDS: readonly TemplateField[] = [
  { recordType: 'lead', key: 'service', label: 'Service', type: 'select', options: ['Website', 'SEO', 'Social media', 'Design', 'App development', 'Ads'] },
  { recordType: 'lead', key: 'budget', label: 'Budget', type: 'select', options: ['Under $1k', '$1k–5k', '$5k–20k', '$20k+'] },
  { recordType: 'deal', key: 'serviceLines', label: 'Service lines', type: 'multiSelect', options: ['Website', 'SEO', 'Social media', 'Design', 'App development', 'Ads'] },
]

const TEMPLATES: readonly VerticalTemplate[] = [
  baseTemplate('blank', {}, [workflow('lead', 'Leads', GENERIC_LEAD_STAGES), workflow('deal', 'Deals', GENERIC_DEAL_STAGES)]),
  baseTemplate('agency', {}, [workflow('lead', 'Leads', GENERIC_LEAD_STAGES), workflow('deal', 'Deals', [
    { name: 'Discovery', category: 'active', color: 'blue', probability: 10 },
    { name: 'Proposal sent', category: 'active', color: 'amber', probability: 40 },
    { name: 'Negotiation', category: 'waiting', color: 'violet', probability: 70 },
    { name: 'Won', category: 'done_success', color: 'green', probability: 100 },
    { name: 'Lost', category: 'done_failure', color: 'red', probability: 0 },
  ])], AGENCY_FIELDS),
  baseTemplate('accounting', { deal: 'Engagement' }, [workflow('lead', 'Leads', GENERIC_LEAD_STAGES), workflow('deal', 'Engagements', [
    { name: 'Onboarding', category: 'open', color: 'blue' }, { name: 'In progress', category: 'active', color: 'amber' },
    { name: 'Filed', category: 'done_success', color: 'green' }, { name: 'Lost', category: 'done_failure', color: 'red' },
  ])], [{ recordType: 'lead', key: 'entityType', label: 'Entity type', type: 'select' }, { recordType: 'lead', key: 'taxYear', label: 'Tax year', type: 'number' }]),
  baseTemplate('education', { deal: 'Enrollment' }, [workflow('lead', 'Inquiries', [
    { name: 'Inquiry', category: 'open', color: 'blue' }, { name: 'Applied', category: 'active', color: 'amber' },
    { name: 'Enrolled', category: 'done_success', color: 'green' }, { name: 'Not enrolled', category: 'done_failure', color: 'red' },
  ]), workflow('deal', 'Enrollments', [
    { name: 'Registered', category: 'open', color: 'blue' }, { name: 'Attending', category: 'active', color: 'amber' },
    { name: 'Completed', category: 'done_success', color: 'green' }, { name: 'Withdrawn', category: 'cancelled', color: 'gray' },
  ])], [{ recordType: 'lead', key: 'program', label: 'Program', type: 'select' }, { recordType: 'lead', key: 'startTerm', label: 'Start term', type: 'select' }]),
  baseTemplate('health', { deal: 'Appointment', contact: 'Client' }, [workflow('lead', 'Leads', [
    { name: 'New', category: 'open', color: 'blue' }, { name: 'Contacted', category: 'active', color: 'amber' },
    { name: 'Booked', category: 'done_success', color: 'green' }, { name: 'Not booked', category: 'done_failure', color: 'red' },
  ]), workflow('deal', 'Appointments', [
    { name: 'Scheduled', category: 'open', color: 'blue' }, { name: 'Attended', category: 'done_success', color: 'green' },
    { name: 'No-show', category: 'done_failure', color: 'red' }, { name: 'Cancelled', category: 'cancelled', color: 'gray' },
  ])], [{ recordType: 'lead', key: 'serviceType', label: 'Service type', type: 'select' }, { recordType: 'lead', key: 'preferredLocation', label: 'Preferred location', type: 'select' }], true),
  baseTemplate('home-inspection', { deal: 'Booking', project: 'Inspection' }, [workflow('lead', 'Leads', GENERIC_LEAD_STAGES), workflow('deal', 'Bookings', [
    { name: 'Scheduled', category: 'open', color: 'blue' }, { name: 'Inspected', category: 'active', color: 'amber' },
    { name: 'Report sent', category: 'done_success', color: 'green' }, { name: 'Cancelled', category: 'cancelled', color: 'gray' },
  ])], [{ recordType: 'lead', key: 'propertyAddress', label: 'Property address', type: 'text' }, { recordType: 'lead', key: 'inspectionType', label: 'Inspection type', type: 'select' }, { recordType: 'lead', key: 'sqft', label: 'Square feet', type: 'number' }]),
  baseTemplate('legal', { deal: 'Matter', organization: 'Firm client', project: 'Case file' }, [workflow('lead', 'Intake', [
    { name: 'New', category: 'open', color: 'blue' }, { name: 'Consultation booked', category: 'active', color: 'amber' },
    { name: 'Consulted', category: 'waiting', color: 'violet' }, { name: 'Retained', category: 'done_success', color: 'green' }, { name: 'Declined', category: 'done_failure', color: 'red' },
  ]), workflow('deal', 'Matters', [
    { name: 'Intake', category: 'open', color: 'blue' }, { name: 'Treatment', category: 'active', color: 'amber' },
    { name: 'Records requested', category: 'waiting', color: 'violet' }, { name: 'Attorney review', category: 'active', color: 'amber' },
    { name: 'Settled', category: 'done_success', color: 'green' }, { name: 'Closed, no recovery', category: 'done_failure', color: 'red' },
  ])], [{ recordType: 'lead', key: 'caseType', label: 'Case type', type: 'select', sensitive: true }, { recordType: 'lead', key: 'incidentDate', label: 'Incident date', type: 'date', sensitive: true }, { recordType: 'lead', key: 'language', label: 'Language', type: 'select', options: ['English', 'Español'] }], true),
  baseTemplate('real-estate', { deal: 'Transaction', contact: 'Client' }, [workflow('lead', 'Leads', [
    { name: 'New', category: 'open', color: 'blue' }, { name: 'Contacted', category: 'active', color: 'amber' },
    { name: 'Showing', category: 'active', color: 'violet' }, { name: 'Offer', category: 'waiting', color: 'amber' }, { name: 'Closed', category: 'done_success', color: 'green' }, { name: 'Lost', category: 'done_failure', color: 'red' },
  ]), workflow('deal', 'Transactions', GENERIC_DEAL_STAGES)], [{ recordType: 'lead', key: 'side', label: 'Side', type: 'select', options: ['Buyer', 'Seller'] }, { recordType: 'lead', key: 'budget', label: 'Budget', type: 'currency' }, { recordType: 'lead', key: 'area', label: 'Area', type: 'text' }]),
  baseTemplate('travel', { deal: 'Trip' }, [workflow('lead', 'Leads', [
    { name: 'New', category: 'open', color: 'blue' }, { name: 'Quoted', category: 'active', color: 'amber' }, { name: 'Booked', category: 'done_success', color: 'green' }, { name: 'Lost', category: 'done_failure', color: 'red' },
  ]), workflow('deal', 'Trips', [
    { name: 'Planning', category: 'open', color: 'blue' }, { name: 'Confirmed', category: 'active', color: 'amber' }, { name: 'Travelled', category: 'done_success', color: 'green' }, { name: 'Cancelled', category: 'cancelled', color: 'gray' },
  ])], [{ recordType: 'lead', key: 'destination', label: 'Destination', type: 'text' }, { recordType: 'lead', key: 'travelDates', label: 'Travel dates', type: 'text' }, { recordType: 'lead', key: 'travellers', label: 'Travellers', type: 'number' }]),
]

export function templateFor(key: string): VerticalTemplate | undefined {
  return TEMPLATES.find((template) => template.key === key)
}

export function allTemplates(): readonly VerticalTemplate[] {
  return TEMPLATES
}
