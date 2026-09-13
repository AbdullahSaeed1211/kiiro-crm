import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { createUnitOfWork, probeTransactions } from '../../src/uow/unit-of-work'

function fakeRequest(begin: () => Promise<string | null>, existingTransaction?: string) {
  const calls: string[] = []
  const db = {
    beginTransaction: () => {
      calls.push('begin')
      return begin()
    },
    commitTransaction: (id: unknown) => {
      calls.push(`commit:${String(id)}`)
      return Promise.resolve()
    },
    rollbackTransaction: (id: unknown) => {
      calls.push(`rollback:${String(id)}`)
      return Promise.resolve()
    },
  }
  const transaction = existingTransaction === undefined ? {} : { transactionID: existingTransaction }
  const req = { payload: { db }, ...transaction } as unknown as PayloadRequest
  return { req, calls, payload: req.payload }
}

const started = () => Promise.resolve('tx-1')
const unsupported = () => Promise.resolve(null)

describe('createUnitOfWork', () => {
  it('commits a transaction it started', async () => {
    const { req, calls } = fakeRequest(started)
    expect(await createUnitOfWork(req).run(() => Promise.resolve('done'))).toBe('done')
    expect(calls).toEqual(['begin', 'commit:tx-1'])
  })

  it('rolls back and rethrows when the work fails', async () => {
    const { req, calls } = fakeRequest(started)
    await expect(createUnitOfWork(req).run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(calls).toEqual(['begin', 'rollback:tx-1'])
  })

  it('runs the work without commit or rollback when the adapter has no transactions', async () => {
    const { req, calls } = fakeRequest(unsupported)
    await expect(createUnitOfWork(req).run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(calls).toEqual(['begin'])
  })

  it('joins a transaction the request already carries without committing it', async () => {
    const { req, calls } = fakeRequest(started, 'outer')
    await createUnitOfWork(req).run(() => Promise.resolve())
    expect(calls).toEqual([])
  })
})

describe('probeTransactions', () => {
  it('reports support after starting and rolling back a transaction', async () => {
    const { payload, calls } = fakeRequest(started)
    expect(await probeTransactions(payload)).toEqual({
      supported: true,
      detail: 'transaction tx-1 started and rolled back',
    })
    expect(calls).toEqual(['begin', 'rollback:tx-1'])
  })

  it('reports no support when no transaction starts or starting throws', async () => {
    expect((await probeTransactions(fakeRequest(unsupported).payload)).supported).toBe(false)
    const failing = fakeRequest(() => Promise.reject(new Error('not supported')))
    expect(await probeTransactions(failing.payload)).toEqual({ supported: false, detail: 'not supported' })
  })
})
