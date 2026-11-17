import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'
import { voiceCallsCollection, voiceDevicesCollection } from '../../src/collections/voice'

function request(user: Readonly<Record<string, unknown>> | null) {
  const req = { user, payload: { find: () => Promise.resolve({ docs: [] }) } } as unknown as PayloadRequest
  return { req }
}

const user = (id: string, role: string, active = true) => ({ id, role, active, groups: [] })

describe('voice collection access', () => {
  it('denies direct API reads of call JSON for every role', async () => {
    const read = voiceCallsCollection.access?.read
    if (read === undefined) throw new Error('Voice calls must define read access')
    expect(await read({ req: request(null).req } as never)).toBe(false)
    expect(await read({ req: request(user('s1', 'staff', false)).req } as never)).toBe(false)
    expect(await read({ req: request(user('m1', 'manager')).req } as never)).toBe(false)
  })

  it('denies direct reads of stored device credentials and all direct writes', async () => {
    const access = voiceDevicesCollection.access
    expect(await access?.read?.({ req: request(user('s1', 'staff')).req } as never)).toBe(false)
    expect(await access?.create?.({ req: request(user('m1', 'manager')).req } as never)).toBe(false)
    expect(await access?.update?.({ req: request(user('m1', 'manager')).req } as never)).toBe(false)
  })
})
