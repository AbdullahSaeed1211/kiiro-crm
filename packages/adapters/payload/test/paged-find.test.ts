import { describe, expect, it } from 'vitest'
import { PAGE_CHUNK, withPagedFind } from '../src/paged-find'

// A stand-in for payload.find over `total` numbered rows that records how it was called.
function fakeFind(total: number) {
  const calls: { limit?: number; page?: number; pagination?: boolean; sort?: unknown }[] = []
  const find = (args: { limit?: number; page?: number; pagination?: boolean; sort?: unknown }) => {
    calls.push(args)
    const limit = args.limit ?? 10
    const page = args.page ?? 1
    const start = args.pagination === false ? 0 : (page - 1) * limit
    const end = args.pagination === false && limit === 0 ? total : start + limit
    const docs = Array.from({ length: Math.min(end, total) - start }, (_, index) => start + index)
    return Promise.resolve({ docs, totalDocs: total, hasNextPage: end < total })
  }
  return { find, calls }
}

// D1 rejects a statement with more than 100 bound variables, so a read of everything must never ask for more than 90.
describe('withPagedFind', () => {
  it('reads everything in chunks of at most 90 and returns one result in order', async () => {
    const { find, calls } = fakeFind(250)
    const result = await withPagedFind(find)({ pagination: false })
    expect(result.docs).toEqual(Array.from({ length: 250 }, (_, index) => index))
    expect(Math.max(...calls.map((call) => call.limit ?? 0))).toBeLessThanOrEqual(PAGE_CHUNK)
    expect(result.hasNextPage).toBe(false)
  })

  it('adds id to the sort so equal values keep one order across pages', async () => {
    const { find, calls } = fakeFind(200)
    await withPagedFind(find)({ limit: 0, sort: 'name' })
    expect(calls.every((call) => JSON.stringify(call.sort) === JSON.stringify(['name', 'id']))).toBe(true)
  })

  it('leaves a read that fits one chunk, and an explicit page, untouched', async () => {
    const small = fakeFind(500)
    await withPagedFind(small.find)({ limit: 50 })
    await withPagedFind(small.find)({ limit: 50, page: 3 })
    expect(small.calls).toEqual([{ limit: 50 }, { limit: 50, page: 3 }])
  })

  it('reads a big explicit page as small ones and keeps the page window and total', async () => {
    const { find, calls } = fakeFind(1200)
    const result = await withPagedFind(find)({ limit: 500, page: 2 })
    expect(result.docs).toEqual(Array.from({ length: 500 }, (_, index) => 500 + index))
    expect(result.totalDocs).toBe(1200)
    expect(Math.max(...calls.map((call) => call.limit ?? 0))).toBeLessThanOrEqual(PAGE_CHUNK)
  })

  it('stops at a caller limit above one chunk', async () => {
    const { find } = fakeFind(500)
    expect((await withPagedFind(find)({ limit: 200 })).docs).toHaveLength(200)
  })
})
