import { describe, expect, it } from 'vitest'
import { toWhere, withScope } from '../../src/where/to-where'

describe('toWhere', () => {
  it('converts nested and/or trees', () => {
    const where = toWhere({
      and: [
        { field: 'title', op: 'like', value: 'plan' },
        {
          or: [
            { field: 'owner', op: 'in', value: ['u1'] },
            { field: 'dueAt', op: 'lt', value: 10 },
          ],
        },
      ],
    })
    expect(where).toEqual({
      and: [{ title: { like: 'plan' } }, { or: [{ owner: { in: ['u1'] } }, { dueAt: { less_than: 10 } }] }],
    })
  })

  it.each([
    ['eq', 'equals'],
    ['neq', 'not_equals'],
    ['in', 'in'],
    ['nin', 'not_in'],
    ['contains', 'contains'],
    ['like', 'like'],
    ['gt', 'greater_than'],
    ['gte', 'greater_than_equal'],
    ['lt', 'less_than'],
    ['lte', 'less_than_equal'],
    ['exists', 'exists'],
  ] as const)('maps %s to %s', (op, operator) => {
    expect(toWhere({ field: 'f', op, value: 1 })).toEqual({ f: { [operator]: 1 } })
  })
})

describe('withScope', () => {
  const scope = { field: 'owner', op: 'in', value: ['u1'] } as const

  it('keeps the query when there is no scope and uses the scope alone when there is no query', () => {
    expect(withScope({ title: { equals: 'a' } }, undefined)).toEqual({ title: { equals: 'a' } })
    expect(withScope(undefined, scope)).toEqual({ owner: { in: ['u1'] } })
  })

  it('ANDs the scope into an existing query', () => {
    expect(withScope({ title: { equals: 'a' } }, scope)).toEqual({
      and: [{ title: { equals: 'a' } }, { owner: { in: ['u1'] } }],
    })
  })
})
