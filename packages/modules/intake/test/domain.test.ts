import { expect, it } from 'vitest'
import {
  sha256Hex,
  intakeDedupeKey,
  submitIntake,
  checkedFormAnswers,
  formFieldsSchema,
  zonedMinuteToUnix,
  type FormField,
} from '../src'
import { intakeActivityNote, mappedLead } from '../src/domain'
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

const BOOKED = 'Booking arranged'
const SERVER_KEY = 'server-key'
const LOCAL_DATE = '2026-09-14'
const CALLBACK_KEY = 'callback'
const NEW_YORK = 'America/New_York'

it('keeps retries idempotent but distinguishes a new call outcome or booking for the same contact and day', async () => {
  const first = {
    phone: '+1 555 0100',
    callerName: 'Rae',
    callOutcome: 'No answer',
    callNotesAndNextStep: 'Try tomorrow',
  }
  const retry = {
    callNotesAndNextStep: 'Try tomorrow',
    callOutcome: 'No answer',
    callerName: 'Rae',
    phone: '+1 555 0100',
  }
  const booking = { ...first, callOutcome: 'Booking arranged', bookingDateAndTime: 1792663200000 }
  expect(await intakeDedupeKey(form.id, first, LOCAL_DATE)).toBe(await intakeDedupeKey(form.id, retry, LOCAL_DATE))
  expect(await intakeDedupeKey(form.id, first, LOCAL_DATE)).not.toBe(
    await intakeDedupeKey(form.id, booking, LOCAL_DATE),
  )
  expect(await intakeDedupeKey(form.id, { ...first, 'cf-turnstile-response': 'token-a' }, LOCAL_DATE)).toBe(
    await intakeDedupeKey(form.id, { ...first, 'cf-turnstile-response': 'token-b' }, LOCAL_DATE),
  )
})

it('writes public caller and outcome answers into the linked lead activity note', () => {
  expect(
    intakeActivityNote({ callerName: 'Rae', callOutcome: 'No answer', callNotesAndNextStep: 'Try tomorrow' }),
  ).toBe('Phone inquiry\nCaller: Rae\nOutcome: No answer\nNotes: Try tomorrow')
})

const bookingFields: readonly FormField[] = [
  { key: 'outcome', label: 'Outcome', type: 'select', required: true, options: ['Interested', BOOKED] },
  {
    key: 'bookingAt',
    label: 'Booking',
    type: 'datetime',
    required: true,
    options: [],
    showWhen: { field: 'outcome', equals: BOOKED },
  },
]

it('rejects a missing booking instant and discards a hidden stale booking', () => {
  expect(checkedFormAnswers(bookingFields, { outcome: BOOKED })).toBeUndefined()
  expect(checkedFormAnswers(bookingFields, { outcome: BOOKED, bookingAt: '2026-10-22' })).toBeUndefined()
  expect(checkedFormAnswers(bookingFields, { outcome: 'Interested', bookingAt: 1792663200000 })).toEqual({
    outcome: 'Interested',
  })
  expect(checkedFormAnswers(bookingFields, { outcome: BOOKED, bookingAt: 1792663200000 })?.['bookingAt']).toBe(
    1792663200000,
  )
})

it('resolves booking wall-clock time to Unix milliseconds without guessing DST gaps or folds', () => {
  expect(zonedMinuteToUnix('2026-10-22T15:30', 'Asia/Kolkata')).toBe(Date.UTC(2026, 9, 22, 10))
  expect(zonedMinuteToUnix('2026-10-22T09:00', NEW_YORK)).toBe(Date.UTC(2026, 9, 22, 13))
  expect(zonedMinuteToUnix('2026-03-08T02:30', NEW_YORK)).toBeUndefined()
  expect(zonedMinuteToUnix('2026-11-01T01:30', NEW_YORK)).toBeUndefined()
})

it('accepts a valid per-question IANA time zone only for datetime questions', () => {
  const base = { key: 'booking', label: 'Booking', required: true, options: [] }
  expect(formFieldsSchema.safeParse([{ ...base, type: 'datetime', timeZone: NEW_YORK }]).success).toBe(true)
  expect(formFieldsSchema.safeParse([{ ...base, type: 'datetime', timeZone: 'Mars/Olympus' }]).success).toBe(false)
  expect(formFieldsSchema.safeParse([{ ...base, type: 'text', timeZone: NEW_YORK }]).success).toBe(false)
})

it('maps only valid Unix milliseconds to a lead next-action date', () => {
  const nextActionForm = { ...form, fieldMap: { nextAction: 'nextActionAt' } }
  expect(mappedLead(nextActionForm, { nextAction: 1792663200000 })['nextActionAt']).toBe(1792663200000)
  expect(mappedLead(nextActionForm, { nextAction: '2026-10-22T15:30' })).not.toHaveProperty('nextActionAt')
  expect(mappedLead(nextActionForm, { nextAction: Number.MAX_SAFE_INTEGER })).not.toHaveProperty('nextActionAt')
})

it('rejects invalid mapped callback timestamps before accepting an intake submission', async () => {
  const callbackForm: IntakeForm = {
    ...form,
    fieldMap: { [CALLBACK_KEY]: 'nextActionAt' },
    formFields: [{ key: CALLBACK_KEY, label: 'Callback', type: 'datetime', required: true, options: [] }],
    serverKeyHashes: [await sha256Hex(SERVER_KEY)],
  }
  const result = await submitIntake(
    {
      form: callbackForm,
      store: store(),
      rateLimiter: allowed,
      serverKey: SERVER_KEY,
      now: 1,
      localDate: LOCAL_DATE,
    },
    { email: 'person@example.test', [CALLBACK_KEY]: '2026-10-22T15:30' },
  )
  expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } })
})

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
      localDate: LOCAL_DATE,
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
      localDate: LOCAL_DATE,
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
  const serverForm = { ...form, requireTurnstile: true, serverKeyHashes: [await sha256Hex(SERVER_KEY)] }
  const result = await submitIntake(
    {
      form: serverForm,
      store: store(),
      rateLimiter: allowed,
      serverKey: SERVER_KEY,
      now: 1,
      localDate: LOCAL_DATE,
    },
    { phone: '+1 555 0100' },
  )
  expect(result.ok).toBe(true)
})
