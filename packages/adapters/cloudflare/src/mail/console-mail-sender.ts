import { createJsonLogger, newId, ok, type Logger, type Result } from '@ops/kernel'
import type { MailMessage, MailSender } from '@ops/platform'

/** Development `MailSender` (`MAIL_TRANSPORT=console`) that logs a summary instead of sending (decision D-23). */
export class ConsoleMailSender implements MailSender {
  private readonly logger: Logger

  /** @param logger destination of the summary line; the JSON console logger by default. */
  constructor(logger: Logger = createJsonLogger()) {
    this.logger = logger
  }

  /**
   * Logs the recipient count and subject only, because addresses and bodies must never reach logs (spec §24).
   * @returns a generated message id; never fails.
   */
  send(message: MailMessage): Promise<Result<{ readonly messageId: string }>> {
    const messageId = newId()
    this.logger.info('mail.console_send', { messageId, recipients: message.to.length, subject: message.subject })
    return Promise.resolve(ok({ messageId }))
  }
}
