import type { GlobalConfig } from 'payload'
import { SETTINGS_ACCESS } from '../access/spike-access'
import { SETTINGS_GLOBAL } from '../contracts/names'
import { ADMIN_GROUPS, currencyField, epochMs, selectOf, textField } from './fields'
import { LOCALE_VALUES, RADIUS_VALUES, SENDER_STATUS_VALUES } from './values'

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/** True when `value` is an IANA time zone the runtime knows. */
export function isTimeZone(value: unknown): boolean {
  if (typeof value !== 'string' || value === '') return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** True for an empty value or a `#rrggbb` color. */
export function isOptionalHexColor(value: unknown): boolean {
  return value === null || value === undefined || value === '' || (typeof value === 'string' && HEX_COLOR.test(value))
}

const moduleToggle = (name: string) => ({ name, type: 'checkbox', defaultValue: true }) as const

/** Tenant settings global (spec §9.12 subset): every active user reads it, only owners change it. */
export const settingsGlobal: GlobalConfig = {
  slug: SETTINGS_GLOBAL,
  access: { ...SETTINGS_ACCESS },
  admin: { group: ADMIN_GROUPS.configuration },
  fields: [
    textField('appName', { maxLength: 60 }),
    {
      ...textField('timezone', { required: true }),
      defaultValue: 'UTC',
      validate: (value: unknown) => isTimeZone(value) || 'Enter an IANA time zone such as Europe/London.',
    },
    selectOf('locale', LOCALE_VALUES, { required: true, defaultValue: 'en' }),
    { ...currencyField('currency', { required: true }), defaultValue: 'USD' },
    {
      name: 'weekStartsOn',
      type: 'number',
      required: true,
      defaultValue: 0,
      validate: (value: unknown) => value === 0 || value === 1 || 'Use 0 for Sunday or 1 for Monday.',
    },
    {
      name: 'brand',
      type: 'group',
      fields: [
        {
          ...textField('primaryHex'),
          validate: (value: unknown) => isOptionalHexColor(value) || 'Enter a color such as #1f6feb.',
        },
        selectOf('radius', RADIUS_VALUES, { required: true, defaultValue: 'md' }),
      ],
    },
    {
      name: 'modules',
      type: 'group',
      fields: [moduleToggle('crm'), moduleToggle('work'), moduleToggle('intake'), moduleToggle('mail')],
    },
    { name: 'stalledDays', type: 'number', required: true, defaultValue: 14, min: 1, max: 365 },
    {
      name: 'email',
      type: 'group',
      fields: [
        textField('fromName', { maxLength: 100 }),
        { name: 'fromAddress', type: 'email' },
        selectOf('senderStatus', SENDER_STATUS_VALUES, { required: true, defaultValue: 'unverified' }),
        textField('inboundDomain', { maxLength: 253 }),
        textField('inboundLocalPrefix', { maxLength: 64 }),
      ],
    },
    epochMs('onboardedAt'),
    {
      name: 'appliedTemplates',
      type: 'array',
      fields: [
        textField('key', { required: true, maxLength: 60 }),
        { name: 'version', type: 'number', required: true, min: 1 },
      ],
    },
  ],
}
