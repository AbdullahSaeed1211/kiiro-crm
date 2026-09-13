import { describe, expect, it } from 'vitest'
import { percentile, summarize } from '../../spike/lib/stats'

const oneTo = (n: number): number[] => Array.from({ length: n }, (_, index) => index + 1)

describe('percentile (nearest rank)', () => {
  it('returns the only sample for every p', () => {
    for (const p of [0, 1, 50, 95, 99, 100]) expect(percentile([7], p)).toBe(7)
  })

  it('takes the lower middle value as p50 of an even count', () => {
    expect(percentile([4, 1, 3, 2], 50)).toBe(2)
    expect(percentile([4, 1, 3, 2], 51)).toBe(3)
    expect(percentile([4, 1, 3, 2], 95)).toBe(4)
    expect(percentile([10, 20], 50)).toBe(10)
  })

  it('takes the middle value of an odd count', () => {
    expect(percentile([5, 1, 3], 50)).toBe(3)
    expect(percentile([900, 700, 800, 1000, 600], 50)).toBe(800)
  })

  it('lands on whole ranks without floating-point drift', () => {
    expect(percentile(oneTo(20), 95)).toBe(19)
    expect(percentile(oneTo(200), 95)).toBe(190)
    expect(percentile(oneTo(200), 50)).toBe(100)
    expect(percentile(oneTo(100), 99)).toBe(99)
  })

  it('maps p0 to the minimum and p100 to the maximum', () => {
    expect(percentile([3, 9, 1], 0)).toBe(1)
    expect(percentile([3, 9, 1], 100)).toBe(9)
  })

  it('rejects an empty sample set and p outside [0, 100]', () => {
    expect(() => percentile([], 50)).toThrow('empty')
    expect(() => percentile([1], -1)).toThrow('[0, 100]')
    expect(() => percentile([1], 101)).toThrow('[0, 100]')
    expect(() => percentile([1], Number.NaN)).toThrow('[0, 100]')
  })

  it('leaves the input order unchanged', () => {
    const values = [3, 1, 2]
    percentile(values, 50)
    expect(values).toEqual([3, 1, 2])
  })
})

describe('summarize', () => {
  it('reports count, min, p50, p95 and max', () => {
    expect(summarize(oneTo(20))).toEqual({ count: 20, min: 1, p50: 10, p95: 19, max: 20 })
    expect(summarize([42])).toEqual({ count: 1, min: 42, p50: 42, p95: 42, max: 42 })
  })
})
