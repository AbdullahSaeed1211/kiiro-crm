import { domainError, err, ok, systemClock, type Clock, type Result } from '@ops/kernel'
import {
  createRecordAddressing,
  receiveInboundEmail,
  type InboundIntakePort,
  type RecordAddressingOptions,
} from '@ops/module-mail'
import type { IntakeRateLimiter } from '@ops/module-intake'
import type { Payload } from 'payload'
import { createMailIntakePort } from './mail-intake'
import { createMailStore } from './mail-store'

export interface InboundMail {
  readonly envelopeFrom: string
  readonly envelopeTo: string
  readonly raw: ArrayBuffer
}

export interface MailInboundOptions extends RecordAddressingOptions {
  readonly timeZone: string
  readonly intakeRateLimiter?: IntakeRateLimiter
  readonly clock?: Clock
}

/** Composes Payload persistence with `@ops/module-mail` for one tenant's inbound email route. */
export function createInboundMailSink(
  payload: Payload,
  options: MailInboundOptions,
): {
  accept(email: InboundMail): Promise<Result<void>>
} {
  // The store verifies tokens by asking the addressing strategy to derive each candidate address.
  // eslint-disable-next-line prefer-const -- this binding is assigned in the Payload error-recovery branch.
  let addressing: ReturnType<typeof createRecordAddressing>
  const store = createMailStore(payload, (record) => addressing.recordAddress(record))
  addressing = createRecordAddressing(options, (token) => store.findRecordByAddressToken(token))
  const intake: InboundIntakePort | undefined =
    options.intakeRateLimiter === undefined
      ? undefined
      : createMailIntakePort(payload, { rateLimiter: options.intakeRateLimiter, timeZone: options.timeZone })
  const clock = options.clock ?? systemClock
  const platformPrefix =
    options.platformDomain === undefined || options.tenantSlug === undefined ? undefined : `${options.tenantSlug}--`
  return {
    accept: async (email) => {
      try {
        const result = await receiveInboundEmail({
          store,
          addressing,
          ...(intake === undefined ? {} : { intake }),
          now: clock.now(),
          envelopeFrom: email.envelopeFrom,
          envelopeTo: withoutPlatformPrefix(email.envelopeTo, platformPrefix),
          raw: email.raw,
        })
        return result.ok ? ok(undefined) : err(result.error)
      } catch {
        return err(domainError('INTERNAL', 'inbound email could not be processed'))
      }
    },
  }
}

function withoutPlatformPrefix(address: string, prefix: string | undefined): string {
  if (prefix === undefined) return address
  const separator = address.indexOf('@')
  const local = separator < 0 ? address : address.slice(0, separator)
  if (!local.toLowerCase().startsWith(prefix.toLowerCase())) return address
  return `${local.slice(prefix.length)}${separator < 0 ? '' : address.slice(separator)}`
}
