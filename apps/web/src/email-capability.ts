export const OUTBOUND_EMAIL_DISABLED_MESSAGE =
  'Email sending will be available after Cloudflare Email Sending is enabled.'

/** Only configured transports are enabled; unknown values fail closed. */
export function isOutboundEmailEnabled(transport: unknown): boolean {
  return transport === 'cloudflare' || transport === 'console'
}
