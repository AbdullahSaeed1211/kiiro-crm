/* eslint-disable sonarjs/no-duplicate-string, @typescript-eslint/require-await -- provider fixtures intentionally repeat protocol values. */
import { expect, it } from 'vitest'
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from '../../src/intake/turnstile'

function response(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

it('sends and validates the expected Turnstile action', async () => {
  let request: RequestInit | undefined
  const accepted = await verifyTurnstile(
    { token: 'token', allowedHostnames: ['site.example'], action: 'lead-intake' },
    {
      secret: 'secret',
      fetcher: async (_url, init) => {
        request = init
        return response({ success: true, hostname: 'site.example', action: 'lead-intake' })
      },
    },
  )
  expect(accepted).toBe(true)
  expect(request?.body).toBeInstanceOf(URLSearchParams)
  expect((request?.body as URLSearchParams).get('action')).toBe('lead-intake')
  expect(TURNSTILE_VERIFY_URL).toContain('siteverify')
  await expect(
    verifyTurnstile(
      { token: 'token', allowedHostnames: ['site.example'], action: 'lead-intake' },
      { secret: 'secret', fetcher: async () => response({ success: true, hostname: 'site.example', action: 'wrong' }) },
    ),
  ).resolves.toBe(false)
})

it('fails closed for missing action and fetch timeout', async () => {
  await expect(
    verifyTurnstile(
      { token: 'token', allowedHostnames: ['site.example'] },
      { secret: 'secret', fetcher: async () => response({ success: true, hostname: 'site.example' }) },
    ),
  ).resolves.toBe(false)
  await expect(
    verifyTurnstile(
      { token: 'token', allowedHostnames: ['site.example'] },
      {
        secret: 'secret',
        timeoutMs: 1,
        fetcher: (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('timeout', 'AbortError'))
            })
          }),
      },
    ),
  ).resolves.toBe(false)
})
