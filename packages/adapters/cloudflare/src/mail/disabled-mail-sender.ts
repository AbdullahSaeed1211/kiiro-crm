import { domainError, err, type Result } from '@ops/kernel'
import type { MailSender } from '@ops/platform'

/** Explicit no-op transport for tenants whose email capability is not enabled. */
export class DisabledMailSender implements MailSender {
  send(): Promise<Result<{ readonly messageId: string }>> {
    return Promise.resolve(err(domainError('UNAVAILABLE', 'Outbound email is disabled for this tenant.')))
  }
}
