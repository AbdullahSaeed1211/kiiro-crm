import type { IntakeForm } from '@ops/module-intake'
import { describe, expect, it } from 'vitest'
import { parsePublicSubmission } from '../../src/server/api/routes/intake/public-recording'

const publicForm: IntakeForm = {
  id: 'form-1',
  key: 'outbound-calls',
  name: 'Outbound calls',
  active: true,
  targetRecordType: 'lead',
  fieldMap: {},
  formFields: [
    { key: 'callerName', label: 'Caller name', type: 'text', required: true, options: [] },
    { key: 'callRecording', label: 'Call recording', type: 'audio', required: false, options: [] },
  ],
  allowedOrigins: ['https://crm.example'],
  requireTurnstile: true,
  serverKeyHashes: [],
  defaultAssigneeIds: [],
  notifyUserIds: [],
  notifyGroupIds: [],
  successMessage: 'Received',
}

function multipartRequest(parts: (form: FormData) => void): Request {
  const body = new FormData()
  parts(body)
  return new Request('https://crm.example/api/v1/intake/outbound-calls', {
    method: 'POST',
    headers: { origin: 'https://crm.example' },
    body,
  })
}

describe('public intake call recording submission', () => {
  it('keeps the JSON intake path for submissions without an optional recording', async () => {
    const request = new Request('https://crm.example/api/v1/intake/outbound-calls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callerName: 'Rae', phone: '+15555550110' }),
    })
    const result = await parsePublicSubmission(request, publicForm)
    expect(result.ok).toBe(true)
    if (result.ok) expect(await result.request.json()).toEqual({ callerName: 'Rae', phone: '+15555550110' })
  })

  it('accepts a valid configured recording field and converts it to a server marker', async () => {
    const request = multipartRequest((body) => {
      body.set('callerName', 'Rae')
      body.set('cf-turnstile-response', 'verified-later')
      body.set('callRecording', new File([new TextEncoder().encode('ID3sample')], 'call.mp3', { type: 'audio/mpeg' }))
    })
    const result = await parsePublicSubmission(request, publicForm)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.recording?.file.name).toBe('call.mp3')
    expect(await result.request.json()).toMatchObject({ callerName: 'Rae', callRecording: 'recording-attached' })
  })
})

describe('public intake recording security', () => {
  it('rejects arbitrary record ids and spoofed file content before intake creates a lead', async () => {
    const forgedId = await parsePublicSubmission(
      multipartRequest((body) => {
        body.set('callerName', 'Rae')
        body.set('recordId', 'victim-lead')
      }),
      publicForm,
    )
    expect(forgedId).toMatchObject({ ok: false, status: 400 })

    const spoofedFile = await parsePublicSubmission(
      multipartRequest((body) => {
        body.set('callerName', 'Rae')
        body.set('callRecording', new File([new TextEncoder().encode('%PDF-1.7')], 'call.mp3', { type: 'audio/mpeg' }))
      }),
      publicForm,
    )
    expect(spoofedFile).toMatchObject({ ok: false, status: 400 })
  })
})
