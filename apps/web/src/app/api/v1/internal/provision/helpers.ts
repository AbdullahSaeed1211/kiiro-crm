export interface ProvisionBody {
  readonly displayName: string
  readonly template: string
  readonly timezone: string
  readonly locale: 'en' | 'es'
  readonly currency: string
  readonly owner: { readonly email: string; readonly name: string }
  readonly intake: { readonly allowedOrigins: readonly string[]; readonly turnstileHostnames: readonly string[] }
}

function objectOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function textOf(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text === '' || text.length > maxLength ? undefined : text
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}

function originsOf(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const origins = value.filter((origin): origin is string => typeof origin === 'string').map((origin) => origin.trim())
  if (origins.length !== value.length || origins.some((origin) => origin.length === 0 || origin.length > 500))
    return undefined
  try {
    if (origins.some((origin) => !['http:', 'https:'].includes(new URL(origin).protocol))) return undefined
  } catch {
    return undefined
  }
  return origins
}

function hostnamesOf(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const hostnames = value
    .filter((hostname): hostname is string => typeof hostname === 'string')
    .map((hostname) => hostname.trim())
  return hostnames.length === value.length &&
    hostnames.every((hostname) => hostname.length > 0 && hostname.length <= 253)
    ? hostnames
    : undefined
}

function validEmail(value: string): boolean {
  const at = value.indexOf('@')
  return at > 0 && at < value.length - 3 && value.indexOf('.', at + 2) > at + 1
}

/** Validates and normalizes the tenant payload sent by the provisioning CLI. */
// eslint-disable-next-line complexity -- provisioning validation must reject the complete payload atomically.
export function provisionBody(value: unknown): ProvisionBody | undefined {
  const body = objectOf(value)
  const owner = objectOf(body?.owner)
  const intake = objectOf(body?.intake)
  const displayName = textOf(body?.displayName, 60)
  const template = textOf(body?.template, 60)
  const timezone = textOf(body?.timezone, 120)
  const currency = textOf(body?.currency, 3)
  const email = textOf(owner?.email, 254)?.toLowerCase()
  const name = textOf(owner?.name, 120)
  const allowedOrigins = originsOf(intake?.allowedOrigins)
  const turnstileHostnames = hostnamesOf(intake?.turnstileHostnames)
  if (
    displayName === undefined ||
    template === undefined ||
    timezone === undefined ||
    !isTimeZone(timezone) ||
    (body?.locale !== 'en' && body?.locale !== 'es') ||
    currency === undefined ||
    !/^[A-Z]{3}$/.test(currency) ||
    email === undefined ||
    !validEmail(email) ||
    name === undefined ||
    allowedOrigins === undefined ||
    turnstileHostnames === undefined
  )
    return undefined
  return {
    displayName,
    template,
    timezone,
    locale: body.locale,
    currency,
    owner: { email, name },
    intake: { allowedOrigins, turnstileHostnames },
  }
}

/** Adds the requested template to settings once, retaining any templates already recorded. */
export function mergeAppliedTemplates(value: unknown, key: string, version = 1): { key: string; version: number }[] {
  const existing = Array.isArray(value)
    ? value.flatMap((entry) => {
        const record = objectOf(entry)
        return typeof record?.key === 'string' && typeof record.version === 'number'
          ? [{ key: record.key, version: record.version }]
          : []
      })
    : []
  if (existing.some((entry) => entry.key === key && entry.version === version)) return existing
  return [...existing, { key, version }]
}
