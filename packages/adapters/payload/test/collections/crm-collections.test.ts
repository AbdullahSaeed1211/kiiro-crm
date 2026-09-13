import type { SanitizedConfig } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'
import { COLLECTIONS, CRM_FIELDS, FIELDS, type SpikeCollectionSlug } from '../../src/contracts/names'
import { RECORD_TYPE_VALUES, STAGE_CATEGORY_VALUES } from '../../src/collections/values'
import { findCollection, findField, indexPathsOf, isHasMany, sanitizeSpikeConfig } from './sanitized-config'

interface Relation {
  readonly slug: SpikeCollectionSlug
  readonly name: string
  readonly relationTo: SpikeCollectionSlug
  readonly hasMany: boolean
}

interface Shape {
  readonly slug: SpikeCollectionSlug
  readonly name: string
  readonly shape: Readonly<Record<string, unknown>>
}

const { contacts, deals, leads, lostReasons, organizations, sources, stageTransitions, users, workflows } = COLLECTIONS

const CONTRACT: readonly (readonly [readonly string[], SpikeCollectionSlug])[] = [
  [CRM_FIELDS.organization, organizations],
  [CRM_FIELDS.contact, contacts],
  [CRM_FIELDS.lead, leads],
  [CRM_FIELDS.deal, deals],
  [CRM_FIELDS.lookup, sources],
  [CRM_FIELDS.lookup, lostReasons],
  [CRM_FIELDS.stageTransition, stageTransitions],
]

const relation = (slug: SpikeCollectionSlug, name: string, relationTo: SpikeCollectionSlug): Relation => ({
  slug,
  name,
  relationTo,
  hasMany: false,
})

const many = (slug: SpikeCollectionSlug, name: string, relationTo: SpikeCollectionSlug): Relation => ({
  ...relation(slug, name, relationTo),
  hasMany: true,
})

const RELATIONS: readonly Relation[] = [
  relation(organizations, 'source', sources),
  relation(contacts, 'organization', organizations),
  relation(contacts, FIELDS.owner, users),
  relation(leads, 'organization', organizations),
  relation(leads, 'source', sources),
  relation(leads, FIELDS.owner, users),
  many(leads, FIELDS.assignees, users),
  relation(leads, 'workflow', workflows),
  relation(leads, 'lostReason', lostReasons),
  relation(leads, 'convertedDeal', deals),
  relation(deals, 'organization', organizations),
  many(deals, 'contacts', contacts),
  relation(deals, 'primaryContact', contacts),
  relation(deals, FIELDS.owner, users),
  many(deals, FIELDS.assignees, users),
  relation(deals, 'workflow', workflows),
  relation(deals, 'sourceLead', leads),
  relation(deals, 'lostReason', lostReasons),
  relation(stageTransitions, 'workflow', workflows),
  relation(stageTransitions, 'changedBy', users),
]

const REQUIRED_TEXT = { type: 'text', required: true }
const EPOCH = { type: 'number', min: 0 }

const SHAPES: readonly Shape[] = [
  { slug: organizations, name: 'customData', shape: { type: 'json' } },
  { slug: contacts, name: 'firstName', shape: REQUIRED_TEXT },
  { slug: contacts, name: 'email', shape: { type: 'email' } },
  { slug: contacts, name: 'customData', shape: { type: 'json' } },
  { slug: leads, name: 'title', shape: REQUIRED_TEXT },
  { slug: leads, name: 'email', shape: { type: 'email' } },
  { slug: leads, name: 'companyName', shape: { type: 'text' } },
  { slug: leads, name: 'stageId', shape: { type: 'text' } },
  { slug: leads, name: 'stageEnteredAt', shape: EPOCH },
  { slug: leads, name: 'lostNote', shape: { type: 'textarea' } },
  { slug: leads, name: 'convertedAt', shape: EPOCH },
  { slug: deals, name: 'title', shape: REQUIRED_TEXT },
  { slug: deals, name: 'valueAmountMinor', shape: { ...EPOCH, validate: expect.any(Function) } },
  { slug: deals, name: 'valueCurrency', shape: { type: 'text', maxLength: 3, validate: expect.any(Function) } },
  { slug: deals, name: 'expectedCloseAt', shape: EPOCH },
  { slug: deals, name: 'closedAt', shape: EPOCH },
  { slug: deals, name: 'lostNote', shape: { type: 'textarea' } },
  { slug: sources, name: 'name', shape: { ...REQUIRED_TEXT, unique: true } },
  { slug: lostReasons, name: 'name', shape: { ...REQUIRED_TEXT, unique: true } },
  {
    slug: stageTransitions,
    name: 'recordType',
    shape: { type: 'select', required: true, options: RECORD_TYPE_VALUES },
  },
  { slug: stageTransitions, name: 'recordId', shape: REQUIRED_TEXT },
  { slug: stageTransitions, name: 'fromStageId', shape: REQUIRED_TEXT },
  { slug: stageTransitions, name: 'toStageId', shape: REQUIRED_TEXT },
  { slug: stageTransitions, name: 'fromCategory', shape: { type: 'select', options: [...STAGE_CATEGORY_VALUES] } },
  { slug: stageTransitions, name: 'toCategory', shape: { type: 'select', options: [...STAGE_CATEGORY_VALUES] } },
  { slug: stageTransitions, name: 'changedAt', shape: { ...EPOCH, required: true } },
  { slug: stageTransitions, name: 'durationMs', shape: { ...EPOCH, required: true } },
]

const INDEXED: readonly (readonly [SpikeCollectionSlug, string])[] = [
  [organizations, 'source'],
  [contacts, 'email'],
  [contacts, 'organization'],
  [contacts, FIELDS.owner],
  [leads, 'stageId'],
  [leads, FIELDS.owner],
  [leads, 'source'],
  [leads, 'createdAt'],
  [leads, 'convertedAt'],
  [leads, 'email'],
  [deals, 'stageId'],
  [deals, FIELDS.owner],
  [deals, 'expectedCloseAt'],
  [deals, 'organization'],
]

let config: SanitizedConfig

beforeAll(async () => {
  config = await sanitizeSpikeConfig()
})

const fieldOf = (slug: string, name: string): unknown => findField(config, slug, name)

describe('CRM collections', () => {
  it.each(CONTRACT.flatMap(([names, slug]) => names.map((name) => ({ slug, name }))))(
    '$slug declares the contract field $name',
    ({ slug, name }) => {
      expect(fieldOf(slug, name)).toBeDefined()
    },
  )

  it.each(RELATIONS)('$slug.$name is a relationship to $relationTo (has many: $hasMany)', (expected) => {
    const field = fieldOf(expected.slug, expected.name)
    expect(field).toMatchObject({ type: 'relationship', relationTo: expected.relationTo })
    expect(isHasMany(field)).toBe(expected.hasMany)
  })

  it.each(SHAPES)('$slug.$name has its field type and limits', ({ slug, name, shape }) => {
    expect(fieldOf(slug, name)).toMatchObject(shape)
  })

  it.each(INDEXED)('%s indexes %s (spec §11)', (slug, name) => {
    expect(fieldOf(slug, name)).toMatchObject({ index: true })
  })

  it('indexes stage transitions by record and time', () => {
    expect(indexPathsOf(config, stageTransitions)).toEqual([['recordType', 'recordId', 'changedAt']])
  })

  it.each([
    [contacts, 'firstName'],
    [leads, 'title'],
    [deals, 'title'],
    [sources, 'name'],
    [lostReasons, 'name'],
  ])('%s shows %s as its title', (slug, title) => {
    expect(findCollection(config, slug).admin.useAsTitle).toBe(title)
  })
})
