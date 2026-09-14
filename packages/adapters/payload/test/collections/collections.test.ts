import type { CollectionConfig, SanitizedConfig } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { canUseAdmin, SETTINGS_ACCESS, SPIKE_ACCESS } from '../../src/access/spike-access'
import { ADMIN_GROUPS, spikeCollections } from '../../src/collections'
import { COLLECTIONS, FIELDS, SETTINGS_GLOBAL, type SpikeCollectionSlug } from '../../src/contracts/names'
import { findCollection, findField, indexPathsOf, isHasMany, sanitizeSpikeConfig } from './sanitized-config'

interface RelationshipExpectation {
  readonly slug: SpikeCollectionSlug
  readonly name: string
  readonly relationTo: SpikeCollectionSlug
  readonly hasMany: boolean
}

const OPERATIONS = ['read', 'create', 'update', 'delete'] as const
const SLUGS = Object.values(COLLECTIONS)

let config: SanitizedConfig

beforeAll(async () => {
  config = await sanitizeSpikeConfig()
})

const collection = (slug: string) => findCollection(config, slug)
const fieldOf = (slug: string, name: string): unknown => findField(config, slug, name)
const indexPaths = (slug: string): string[][] => indexPathsOf(config, slug)

const GROUP_ORDER: readonly string[] = Object.values(ADMIN_GROUPS)
const groupRank = (candidate: CollectionConfig): number =>
  GROUP_ORDER.findIndex((group) => group === candidate.admin?.group)

describe('spike collections', () => {
  it('sanitizes every spike collection and the settings global', () => {
    const slugs = spikeCollections.map((candidate) => candidate.slug)
    expect(config.collections.map((candidate) => candidate.slug)).toEqual(expect.arrayContaining(SLUGS))
    expect(slugs).toHaveLength(SLUGS.length)
    expect(slugs).toEqual(expect.arrayContaining(SLUGS))
    expect(config.globals.map((global) => global.slug)).toContain(SETTINGS_GLOBAL)
  })

  it('lists the collections in admin group order', () => {
    const ranks = spikeCollections.map(groupRank)
    expect(ranks).not.toContain(-1)
    expect(ranks).toEqual([...ranks].sort((left, right) => left - right))
  })

  it('declares the user role and active flag the access functions read', () => {
    expect(fieldOf(COLLECTIONS.users, FIELDS.role)).toMatchObject({
      type: 'select',
      required: true,
      defaultValue: 'staff',
      options: ['owner', 'manager', 'staff'],
    })
    expect(fieldOf(COLLECTIONS.users, FIELDS.active)).toMatchObject({ type: 'checkbox', defaultValue: true })
  })

  it.each(SLUGS)('%s uses its SPIKE_ACCESS functions, timestamps and no versions', (slug) => {
    const sanitized = collection(slug)
    OPERATIONS.forEach((operation) => {
      expect(sanitized.access[operation]).toBe(SPIKE_ACCESS[slug][operation])
    })
    expect(sanitized.timestamps).toBe(true)
    expect(sanitized.versions).toBeFalsy()
  })
})

describe('contract relationships', () => {
  const relationships: readonly RelationshipExpectation[] = [
    { slug: COLLECTIONS.users, name: FIELDS.groups, relationTo: COLLECTIONS.groups, hasMany: true },
    { slug: COLLECTIONS.users, name: FIELDS.reportsTo, relationTo: COLLECTIONS.users, hasMany: false },
    { slug: COLLECTIONS.organizations, name: FIELDS.owner, relationTo: COLLECTIONS.users, hasMany: false },
    { slug: COLLECTIONS.projects, name: FIELDS.owner, relationTo: COLLECTIONS.users, hasMany: false },
    { slug: COLLECTIONS.projects, name: FIELDS.members, relationTo: COLLECTIONS.users, hasMany: true },
    { slug: COLLECTIONS.tasks, name: FIELDS.assignees, relationTo: COLLECTIONS.users, hasMany: true },
    { slug: COLLECTIONS.tasks, name: FIELDS.group, relationTo: COLLECTIONS.groups, hasMany: false },
    { slug: COLLECTIONS.tasks, name: FIELDS.project, relationTo: COLLECTIONS.projects, hasMany: false },
    { slug: COLLECTIONS.notifications, name: FIELDS.user, relationTo: COLLECTIONS.users, hasMany: false },
    { slug: COLLECTIONS.attachments, name: FIELDS.uploadedBy, relationTo: COLLECTIONS.users, hasMany: false },
  ]

  it.each(relationships)('$slug.$name is a relationship to $relationTo (has many: $hasMany)', (expected) => {
    const field = fieldOf(expected.slug, expected.name)
    expect(field).toMatchObject({ type: 'relationship', relationTo: expected.relationTo })
    expect(isHasMany(field)).toBe(expected.hasMany)
  })
})

describe('users auth', () => {
  it('keeps the decision D-38 session and lockout values and gates the admin panel', () => {
    const users = collection(COLLECTIONS.users)
    expect(users.auth).toMatchObject({
      tokenExpiration: 604800,
      maxLoginAttempts: 5,
      lockTime: 600000,
      useAPIKey: false,
      cookies: { sameSite: 'Lax', secure: false },
    })
    expect(users.access.admin).toBe(canUseAdmin)
    expect(users.admin.useAsTitle).toBe('name')
    expect(fieldOf(COLLECTIONS.users, 'email')).toMatchObject({ type: 'email', unique: true })
  })
})

describe('settings global', () => {
  it('uses the settings access functions and holds the §9.12 fields', () => {
    const settings = config.globals.find((global) => global.slug === SETTINGS_GLOBAL)
    expect(settings?.access.read).toBe(SETTINGS_ACCESS.read)
    expect(settings?.access.update).toBe(SETTINGS_ACCESS.update)
    const names = settings?.flattenedFields.map((field) => field.name)
    const expected = ['appName', 'timezone', 'locale', 'currency', 'weekStartsOn', 'brand', 'modules', 'stalledDays']
    expect(names).toEqual(expect.arrayContaining([...expected, 'email', 'onboardedAt', 'appliedTemplates']))
    expect(settings?.admin.group).toBe(ADMIN_GROUPS.configuration)
  })
})

describe('admin groups', () => {
  const groups: Readonly<Record<SpikeCollectionSlug, string>> = {
    users: ADMIN_GROUPS.people,
    groups: ADMIN_GROUPS.people,
    organizations: ADMIN_GROUPS.records,
    projects: ADMIN_GROUPS.records,
    tasks: ADMIN_GROUPS.records,
    workflows: ADMIN_GROUPS.configuration,
    activity: ADMIN_GROUPS.system,
    attachments: ADMIN_GROUPS.system,
    notifications: ADMIN_GROUPS.system,
    emailMessages: ADMIN_GROUPS.system,
    jobRuns: ADMIN_GROUPS.system,
    contacts: ADMIN_GROUPS.records,
    leads: ADMIN_GROUPS.records,
    deals: ADMIN_GROUPS.records,
    sources: ADMIN_GROUPS.configuration,
    lostReasons: ADMIN_GROUPS.configuration,
    stageTransitions: ADMIN_GROUPS.system,
  }

  it.each(Object.entries(groups))('%s sits in the %s group', (slug, group) => {
    expect(collection(slug).admin.group).toBe(group)
  })
})

describe('indexes, uploads and validation', () => {
  it('declares the §11 compound and unique indexes', () => {
    expect(indexPaths(COLLECTIONS.tasks)).toEqual([
      [FIELDS.project, 'stageId', 'rank'],
      ['relatedType', 'relatedId'],
    ])
    expect(indexPaths(COLLECTIONS.activity)).toEqual([['recordType', 'recordId', 'occurredAt']])
    expect(indexPaths(COLLECTIONS.notifications)).toEqual([[FIELDS.user, 'readAt', 'createdAt']])
    expect(collection(COLLECTIONS.jobRuns).indexes).toEqual([{ fields: ['job', 'windowStart'], unique: true }])
    expect(fieldOf(COLLECTIONS.notifications, 'dedupeKey')).toMatchObject({ unique: true, index: true })
    expect(fieldOf(COLLECTIONS.emailMessages, 'messageId')).toMatchObject({ unique: true })
    expect(fieldOf(COLLECTIONS.groups, 'name')).toMatchObject({ unique: true })
  })

  it('makes attachments an upload collection limited to the §9.7 types', () => {
    const upload = collection(COLLECTIONS.attachments).upload
    expect(upload).toHaveProperty('mimeTypes', expect.arrayContaining(['application/pdf', 'image/png', 'text/csv']))
    expect(fieldOf(COLLECTIONS.attachments, 'filename')).toBeDefined()
  })

  it('wires the workflow stage validators', () => {
    expect(fieldOf(COLLECTIONS.workflows, 'stages')).toHaveProperty('validate')
    expect(fieldOf(COLLECTIONS.workflows, 'defaultStageId')).toHaveProperty('validate')
  })
})
