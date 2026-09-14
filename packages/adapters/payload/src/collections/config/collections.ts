import type { CollectionConfig, Field, GlobalConfig } from 'payload'
import { ADMIN_GROUPS } from '../fields'
import { configAccess, sharedViewAccess } from './access'
import { configEpoch, configJson, configRelation, configText } from './fields'

const RECORD_TYPES = ['organization', 'contact', 'lead', 'deal', 'project', 'task'] as const
const VIEW_KINDS = ['table', 'board', 'calendar', 'timeline'] as const
const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'select',
  'multiSelect',
  'checkbox',
  'email',
  'url',
] as const

type AccessConfig = NonNullable<CollectionConfig['access']>
const withDefault = (field: Field, defaultValue: unknown): Field => ({ ...field, defaultValue }) as Field
const withValidation = (field: Field, validate: (value: unknown) => true | string): Field =>
  ({ ...field, validate }) as Field
const base = (slug: string, fields: CollectionConfig['fields'], access: AccessConfig): CollectionConfig => ({
  slug,
  admin: { group: ADMIN_GROUPS.configuration },
  fields,
  access,
  timestamps: true,
  versions: false,
})

export const fieldDefinitionsCollection = base(
  'fieldDefinitions',
  [
    { name: 'recordType', type: 'select', options: [...RECORD_TYPES], required: true, index: true },
    configText('key', { required: true, index: true, maxLength: 80 }),
    configText('label', { required: true, maxLength: 120 }),
    { name: 'type', type: 'select', options: [...FIELD_TYPES], required: true },
    { name: 'required', type: 'checkbox', defaultValue: false },
    configJson('options', { defaultValue: [] }),
    { name: 'visibility', type: 'select', options: ['all', 'manager_up'], defaultValue: 'all' },
    { name: 'sensitive', type: 'checkbox', defaultValue: false },
    { name: 'hidden', type: 'checkbox', defaultValue: false },
    { name: 'position', type: 'number', min: 0, defaultValue: 0 },
  ],
  {
    read: configAccess.activeRead,
    create: configAccess.managerUp,
    update: configAccess.managerUp,
    delete: configAccess.managerUp,
  },
)
fieldDefinitionsCollection.indexes = [{ fields: ['recordType', 'key'], unique: true }]

export const workflowsConfigCollection = base(
  'workflows',
  [
    { name: 'recordType', type: 'select', options: [...RECORD_TYPES], required: true, index: true },
    configText('name', { required: true, maxLength: 120 }),
    configJson('stages', { required: true, defaultValue: [] }),
    configText('defaultStageId', { required: true }),
  ],
  {
    read: configAccess.activeRead,
    create: configAccess.managerUp,
    update: configAccess.managerUp,
    delete: configAccess.managerUp,
  },
)

export const savedViewsCollection = base(
  'savedViews',
  [
    { name: 'recordType', type: 'select', options: [...RECORD_TYPES], required: true, index: true },
    configRelation('owner', 'users', { index: true }),
    configText('name', { required: true, maxLength: 120 }),
    { name: 'kind', type: 'select', options: [...VIEW_KINDS], required: true, defaultValue: 'table' },
    configJson('filter', { defaultValue: null }),
    configJson('sort', { required: true, defaultValue: [] }),
    configJson('columns', { required: true, defaultValue: [] }),
    { name: 'pinned', type: 'checkbox', defaultValue: false },
    { name: 'isDefault', type: 'checkbox', defaultValue: false },
  ],
  sharedViewAccess,
)
savedViewsCollection.indexes = [{ fields: ['recordType', 'owner'] }]

export const layoutsCollection = base(
  'layouts',
  [
    { name: 'recordType', type: 'select', options: [...RECORD_TYPES], required: true, unique: true, index: true },
    configJson('sidebarFields', { required: true, defaultValue: [] }),
    configJson('quickCreateFields', { required: true, defaultValue: [] }),
  ],
  {
    read: configAccess.activeRead,
    create: configAccess.managerUp,
    update: configAccess.managerUp,
    delete: configAccess.managerUp,
  },
)

const HEX = /^#[0-9a-f]{6}$/i
export const isHexColor = (value: unknown): boolean => typeof value === 'string' && HEX.test(value)
export const isIanaTimeZone = (value: unknown): boolean => {
  if (typeof value !== 'string' || value.length === 0) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export const settingsGlobalConfig: GlobalConfig = {
  slug: 'settings',
  admin: { group: ADMIN_GROUPS.configuration },
  access: { read: configAccess.activeRead, update: configAccess.ownerOnly },
  fields: [
    configText('appName', { maxLength: 60 }),
    withValidation(
      withDefault(configText('timezone', { required: true }), 'UTC'),
      (value) => isIanaTimeZone(value) || 'Enter an IANA time zone.',
    ),
    { name: 'locale', type: 'select', options: ['en', 'es'], required: true, defaultValue: 'en' },
    withDefault(configText('currency', { required: true, maxLength: 3 }), 'USD'),
    withValidation(
      withDefault({ name: 'weekStartsOn', type: 'number', required: true }, 0),
      (value) => value === 0 || value === 1 || 'Use 0 or 1.',
    ),
    {
      name: 'brand',
      type: 'group',
      fields: [
        withValidation(
          configText('primaryHex'),
          (value) =>
            value === '' ||
            value === null ||
            value === undefined ||
            isHexColor(value) ||
            'Enter a six-digit hex color.',
        ),
        { name: 'radius', type: 'select', options: ['sm', 'md', 'lg'], required: true, defaultValue: 'md' },
      ],
    },
    {
      name: 'modules',
      type: 'group',
      fields: ['crm', 'work', 'intake', 'mail'].map((name) => ({
        name,
        type: 'checkbox' as const,
        defaultValue: true,
      })),
    },
    { name: 'terminology', type: 'json', defaultValue: {} },
    { name: 'stalledDays', type: 'number', min: 1, max: 365, required: true, defaultValue: 14 },
    {
      name: 'email',
      type: 'group',
      fields: [
        configText('fromName'),
        { name: 'fromAddress', type: 'email' },
        configText('inboundDomain'),
        configText('inboundLocalPrefix'),
      ],
    },
    configEpoch('onboardedAt'),
    {
      name: 'appliedTemplates',
      type: 'array',
      fields: [configText('key', { required: true }), { name: 'version', type: 'number', required: true, min: 1 }],
    },
  ],
}

export const configCollections: readonly CollectionConfig[] = [
  fieldDefinitionsCollection,
  workflowsConfigCollection,
  savedViewsCollection,
  layoutsCollection,
]
