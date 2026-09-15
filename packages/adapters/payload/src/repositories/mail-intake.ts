import { domainError, err, ok } from '@ops/kernel'
import type { InboundIntakePort } from '@ops/module-mail'
import { submitIntake as submitIntakeForm, type IntakeRateLimiter } from '@ops/module-intake'
import type { Payload } from 'payload'
import { COLLECTIONS } from '../contracts/names'
import { createIntakeStore, toIntakeForm } from './intake-store'

const localDate = (timestamp: number, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(timestamp),
  )

/** Bridges the mail alias command to the existing intake validation and dedupe command. */
export function createMailIntakePort(
  payload: Payload,
  options: Readonly<{ rateLimiter: IntakeRateLimiter; timeZone: string }>,
): InboundIntakePort {
  const store = createIntakeStore(payload)
  return {
    submit: async ({ formId, payload: values, receivedAt }) => {
      const page = await payload.find({
        collection: COLLECTIONS.intakeForms,
        where: { id: { equals: formId } },
        limit: 1,
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      const form = page.docs[0] === undefined ? undefined : toIntakeForm(page.docs[0])
      if (form === undefined) return err(domainError('NOT_FOUND', 'intake form not found'))
      const result = await submitIntakeForm(
        {
          form,
          store,
          rateLimiter: options.rateLimiter,
          now: receivedAt,
          localDate: localDate(receivedAt, options.timeZone),
          channel: 'email',
        },
        values,
      )
      if (!result.ok) return result
      return ok({
        status: result.value.status,
        ...(result.value.recordRef === undefined ? {} : { recordRef: result.value.recordRef }),
      })
    },
  }
}
