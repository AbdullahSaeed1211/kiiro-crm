/* eslint-disable max-lines-per-function, sonarjs/no-duplicate-string -- one focused matrix covers the public HTTP contract. */
import { describe, expect, it } from 'vitest'
import { handleIntakeRequest } from '../../src/intake/request'
import type { IntakeForm, IntakeStore } from '../../../../modules/intake/src'

const form: IntakeForm = {
  id: 'form-1',
  key: 'contact',
  name: 'Contact',
  active: true,
  targetRecordType: 'lead',
  fieldMap: {},
  allowedOrigins: ['https://site.example'],
  requireTurnstile: false,
  serverKeyHashes: [],
  defaultAssigneeIds: [],
  notifyUserIds: [],
  notifyGroupIds: [],
  successMessage: 'Thanks',
}

function store(): IntakeStore {
  return {
    findByDedupeKey: () => Promise.resolve(undefined),
    insertSubmission: (submission) =>
      Promise.resolve({ ok: true as const, value: { id: 'submission-1', ...submission } }),
    markDuplicate: () => Promise.resolve(undefined),
    createLead: () => Promise.resolve({ id: 'lead-1' }),
    addComment: () => Promise.resolve(undefined),
    notify: () => Promise.resolve(undefined),
  }
}

function deps(
  overrides: Partial<Parameters<typeof handleIntakeRequest>[1]> = {},
): Parameters<typeof handleIntakeRequest>[1] {
  return {
    form,
    store: store(),
    rateLimiter: { check: () => Promise.resolve(true) },
    timeZone: 'America/New_York',
    ...overrides,
  }
}

describe('handleIntakeRequest HTTP contract', () => {
  it('reflects only an exact allowlisted origin for preflight', async () => {
    const allowed = await handleIntakeRequest(
      new Request('https://crm.example/api', { method: 'OPTIONS', headers: { Origin: 'https://site.example' } }),
      deps(),
    )
    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://site.example')
    expect(allowed.headers.get('Vary')).toBe('Origin')
    expect(allowed.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')

    const denied = await handleIntakeRequest(
      new Request('https://crm.example/api', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }),
      deps(),
    )
    expect(denied.status).toBe(403)
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(denied.headers.get('Vary')).toBe('Origin')
  })

  it('returns CORS on successful and rejected POST responses', async () => {
    const okResponse = await handleIntakeRequest(
      new Request('https://crm.example/api', {
        method: 'POST',
        headers: { Origin: 'https://site.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'person@example.test' }),
      }),
      deps(),
    )
    expect(okResponse.status).toBe(200)
    expect(okResponse.headers.get('Access-Control-Allow-Origin')).toBe('https://site.example')

    const rejected = await handleIntakeRequest(
      new Request('https://crm.example/api', {
        method: 'POST',
        headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'person@example.test' }),
      }),
      deps(),
    )
    expect(rejected.status).toBe(403)
    expect(rejected.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(rejected.headers.get('Vary')).toBe('Origin')
  })

  it('rejects unsupported methods and content types before parsing', async () => {
    const get = await handleIntakeRequest(new Request('https://crm.example/api', { method: 'GET' }), deps())
    expect(get.status).toBe(405)
    expect(get.headers.get('Allow')).toBe('POST, OPTIONS')
    const xml = await handleIntakeRequest(
      new Request('https://crm.example/api', {
        method: 'POST',
        headers: { 'Content-Type': 'text/xml' },
        body: '<x />',
      }),
      deps(),
    )
    expect(xml.status).toBe(415)
  })

  it('rejects an oversized body before JSON parsing', async () => {
    const response = await handleIntakeRequest(
      new Request('https://crm.example/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' },
        body: JSON.stringify({ email: 'person@example.test', message: 'x'.repeat(17 * 1024) }),
      }),
      deps(),
    )
    expect(response.status).toBe(413)
  })

  it('accepts form posts and server-key JSON without a browser origin', async () => {
    const formResponse = await handleIntakeRequest(
      new Request('https://crm.example/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://site.example' },
        body: 'email=person%40example.test&message=hello',
      }),
      deps(),
    )
    expect(formResponse.status).toBe(200)

    const serverForm = { ...form, serverKeyHashes: ['a'] }
    const serverResponse = await handleIntakeRequest(
      new Request('https://crm.example/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Intake-Key': 'not-a' },
        body: JSON.stringify({ phone: '+1 555 0100' }),
      }),
      deps({ form: serverForm }),
    )
    expect(serverResponse.status).toBe(403)
  })
})
