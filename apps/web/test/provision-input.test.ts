import { describe, expect, it } from 'vitest'
import { mergeAppliedTemplates, provisionBody } from '../src/app/api/v1/internal/provision/helpers'

const input = {
  displayName: 'Acme Operations',
  template: 'agency',
  timezone: 'America/New_York',
  locale: 'es',
  currency: 'EUR',
  owner: { email: 'Owner@Example.test', name: 'Owner' },
  intake: { allowedOrigins: ['https://acme.example.test'], turnstileHostnames: ['acme.example.test'] },
}

describe('provisioning input', () => {
  it('preserves the tenant settings, template, owner and intake configuration', () => {
    expect(provisionBody(input)).toEqual({
      ...input,
      owner: { email: 'owner@example.test', name: 'Owner' },
    })
  })

  it('rejects incomplete or unsafe provisioning input', () => {
    expect(provisionBody({ ...input, template: undefined })).toBeUndefined()
    expect(provisionBody({ ...input, timezone: 'Not/A_Timezone' })).toBeUndefined()
    expect(
      provisionBody({ ...input, intake: { allowedOrigins: ['file:///tmp'], turnstileHostnames: [] } }),
    ).toBeUndefined()
  })
})

describe('provisioning template state', () => {
  it('adds a template once without discarding existing template records', () => {
    const existing = [
      { key: 'agency', version: 1 },
      { key: 'custom', version: 2 },
    ]
    expect(mergeAppliedTemplates(existing, 'agency')).toEqual(existing)
    expect(mergeAppliedTemplates(existing, 'agency', 2)).toEqual([...existing, { key: 'agency', version: 2 }])
  })
})
