import { expect, it } from 'vitest'
import { sha256Hex, submitIntake } from '../src'
import type { IntakeForm, IntakeStore } from '../src'

const form: IntakeForm = {
  id: 'form-1',
  key: 'contact',
  name: 'Contact',
  active: true,
  targetRecordType: 'lead',
  fieldMap: { name: 'firstName', message: 'custom:message' },
  allowedOrigins: ['https://site.example'],
  requireTurnstile: true,
  serverKeyHashes: [],
  defaultAssigneeIds: [],
  notifyUserIds: [],
  notifyGroupIds: [],
  successMessage: 'Thanks',
}
function store(): IntakeStore & { leads: number; submissions: number } {
  const state = { leads: 0, submissions: 0 }
  return {
    ...state,
    findByDedupeKey: () => Promise.resolve(undefined),
    insertSubmission: (submission) => {
      state.submissions += 1
      return Promise.resolve({
        ok: true as const,
        value: { id: `submission-${String(state.submissions)}`, ...submission },
      })
    },
    markDuplicate: () => Promise.resolve(undefined),
    createLead: () => {
      state.leads += 1
      return Promise.resolve({ id: 'lead-1' })
    },
    addComment: () => Promise.resolve(undefined),
    notify: () => Promise.resolve(undefined),
    get leads() {
      return state.leads
    },
    get submissions() {
      return state.submissions
    },
  }
}
const allowed = { check: () => Promise.resolve(true) }

it('fails closed for an unlisted origin before Turnstile', async () => {
  let verified = false
  const result = await submitIntake(
    {
      form,
      store: store(),
      rateLimiter: allowed,
      turnstile: {
        verify: () => {
          verified = true
          return Promise.resolve(true)
        },
      },
      origin: 'https://evil.example',
      turnstileToken: 'token',
      production: true,
      now: 1,
      localDate: '2026-09-14',
    },
    { email: 'person@example.test' },
  )
  expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } })
  expect(verified).toBe(false)
})

it('accepts a verified browser submission and creates one lead', async () => {
  const saved = store()
  const result = await submitIntake(
    {
      form,
      store: saved,
      rateLimiter: allowed,
      turnstile: { verify: (input) => Promise.resolve(input.token === 'valid') },
      origin: 'https://site.example',
      turnstileToken: 'valid',
      production: true,
      now: 1,
      localDate: '2026-09-14',
    },
    { name: 'Ada', email: 'Ada@Example.test', message: 'Hello' },
  )
  expect(result).toMatchObject({
    ok: true,
    value: { status: 'accepted', message: 'Thanks', recordRef: { type: 'lead', id: 'lead-1' } },
  })
  expect(saved.leads).toBe(1)
  expect(saved.submissions).toBe(1)
})

it('accepts a valid server key without origin or Turnstile', async () => {
  const serverForm = { ...form, requireTurnstile: true, serverKeyHashes: [await sha256Hex('server-key')] }
  const result = await submitIntake(
    {
      form: serverForm,
      store: store(),
      rateLimiter: allowed,
      serverKey: 'server-key',
      now: 1,
      localDate: '2026-09-14',
    },
    { phone: '+1 555 0100' },
  )
  expect(result.ok).toBe(true)
})
