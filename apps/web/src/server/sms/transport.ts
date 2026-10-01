/** A tenant's text-message settings, set as Worker secrets; texting is off until all three exist. */
export interface SmsConfig {
  readonly accountSid: string
  readonly authToken: string
  /** The number or messaging-service sender that texts come from, in international form. */
  readonly from: string
}

/** A secret that was never set is missing from the Worker's environment, so it can be undefined. */
interface SmsSecrets {
  readonly TWILIO_ACCOUNT_SID: string | undefined
  readonly TWILIO_AUTH_TOKEN: string | undefined
  readonly TWILIO_FROM_NUMBER: string | undefined
}

const filled = (value: string | undefined): string => (value ?? '').trim()

/** The settings when all three secrets are filled in, otherwise undefined and texting stays off. */
export function smsConfig(env: SmsSecrets): SmsConfig | undefined {
  const config = {
    accountSid: filled(env.TWILIO_ACCOUNT_SID),
    authToken: filled(env.TWILIO_AUTH_TOKEN),
    from: filled(env.TWILIO_FROM_NUMBER),
  }
  return Object.values(config).every((value) => value !== '') ? config : undefined
}

/** `+` and 8 to 15 digits, with spaces, dashes, dots and brackets removed; undefined when no country code is given. */
export function internationalNumber(input: string): string | undefined {
  const compact = input.replaceAll(/[\s\-.()]/gu, '')
  return /^\+[1-9]\d{7,14}$/u.test(compact) ? compact : undefined
}

/** The development account name that logs texts instead of sending them. */
const CONSOLE_ACCOUNT = 'console'
const MESSAGES_HOST = 'https://api.twilio.com'

/** Sends one text and returns the provider's id for it. Throws with the provider's reason when it refuses. */
export async function sendSms(
  config: SmsConfig,
  message: Readonly<{ to: string; body: string }>,
  send: typeof fetch = fetch,
): Promise<string> {
  if (config.accountSid === CONSOLE_ACCOUNT) {
    console.log('[sms.console]', message.to, message.body.length)
    return `console-${crypto.randomUUID()}`
  }
  const url = `${MESSAGES_HOST}/2010-04-01/Accounts/${config.accountSid}/Messages.json`
  const response = await send(url, {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + btoa(config.accountSid + ':' + config.authToken),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: message.to, From: config.from, Body: message.body }),
  })
  const result: unknown = await response.json().catch(() => ({}))
  const field = (name: string): string | undefined => {
    const value: unknown = typeof result === 'object' && result !== null ? Reflect.get(result, name) : undefined
    return typeof value === 'string' ? value : undefined
  }
  const refusal = 'SMS provider answered ' + String(response.status)
  if (!response.ok) throw new Error(field('message') ?? refusal)
  const id = field('sid')
  if (id === undefined) throw new Error('SMS provider gave no message id')
  return id
}
