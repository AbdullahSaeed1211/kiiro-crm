import { PayloadEmailSendError } from '@ops/adapter-cloudflare'
import { expect, it } from 'vitest'
import { requestPasswordResetSafely } from '../../src/server/auth/forgot-password'

it('uses the same public response for an unknown account and a mail-delivery failure', async () => {
  const logs: { message: string; details: Readonly<Record<string, string>> }[] = []
  const logger = (message: string, details: Readonly<Record<string, string>>) => logs.push({ message, details })

  const unknownAccount = await requestPasswordResetSafely(() => Promise.resolve(undefined), logger)
  const deliveryFailure = await requestPasswordResetSafely(
    () => Promise.reject(new PayloadEmailSendError('UNAVAILABLE', 'E_VALIDATION_ERROR')),
    logger,
  )

  expect(deliveryFailure).toEqual(unknownAccount)
  expect(logs).toEqual([
    {
      message: '[auth.forgot-password] reset operation failed',
      details: { failure: 'email_delivery', code: 'UNAVAILABLE', providerCode: 'E_VALIDATION_ERROR' },
    },
  ])
})

it('does not log reset tokens or recipient addresses when the reset operation fails', async () => {
  const logs: { message: string; details: Readonly<Record<string, string>> }[] = []
  const logger = (message: string, details: Readonly<Record<string, string>>) => logs.push({ message, details })
  const secretFailure = new Error('delivery failed for owner@example.test with reset token secret-reset-token')

  await requestPasswordResetSafely(() => Promise.reject(secretFailure), logger)

  expect(JSON.stringify(logs)).not.toContain('owner@example.test')
  expect(JSON.stringify(logs)).not.toContain('secret-reset-token')
  expect(logs[0]?.details).toEqual({ failure: 'reset_request' })
})
