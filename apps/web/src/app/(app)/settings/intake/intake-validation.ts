/* eslint-disable complexity, sonarjs/cognitive-complexity, max-lines-per-function, max-statements -- validation intentionally keeps the fail-closed policy in one unit. */

export const INTAKE_KEY_PATTERN = /^[a-z0-9-]{2,60}$/
const INTAKE_ALIAS_PATTERN = /^[a-z0-9][a-z0-9+._-]{1,63}$/

const recordOf = (input: unknown): Record<string, unknown> =>
  typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {}
const stringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined

function stringListValue(value: unknown, separators = /[\n,]+/): string[] {
  let values: unknown[]
  if (Array.isArray(value)) values = value
  else if (typeof value === 'string') values = value.split(separators)
  else values = []
  return [
    ...new Set(values.filter((item): item is string => typeof item === 'string').map((item) => item.trim())),
  ].filter(Boolean)
}

function idListValue(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === 'string' && item.trim() !== '').map((item) => item.trim()),
    ),
  ]
}

function optionalId(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null
  return stringValue(value)
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false
  return fallback
}

function normalizedOriginList(
  value: unknown,
): { readonly ok: true; readonly value: string[] } | { readonly ok: false; readonly error: string } {
  const values = stringListValue(value)
  const normalized: string[] = []
  for (const origin of values) {
    try {
      const url = new URL(origin)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol')
      if (url.pathname !== '/' || url.search !== '' || url.hash !== '')
        throw new Error('origin must not contain a path')
      const serialized = url.origin
      if (!normalized.includes(serialized)) normalized.push(serialized)
    } catch {
      return { ok: false, error: `Allowed origin is invalid: ${origin}` }
    }
  }
  return { ok: true, value: normalized }
}

/** Validates the public intake settings without ever accepting client-supplied key hashes. */
export function parseIntakeFormSettings(
  input: unknown,
): { readonly ok: true; readonly data: Record<string, unknown> } | { readonly ok: false; readonly error: string } {
  const data = recordOf(input)
  const name = stringValue(data.name)
  const key = stringValue(data.key)?.toLowerCase()
  if (name === undefined || name.length > 120 || key === undefined || !INTAKE_KEY_PATTERN.test(key))
    return { ok: false, error: 'Name and a lowercase URL-safe key are required.' }

  const origins = normalizedOriginList(data.allowedOrigins)
  if (!origins.ok) return origins
  const successMessage = stringValue(data.successMessage)
  if (successMessage === undefined || successMessage.length > 500)
    return { ok: false, error: 'A success message of 1–500 characters is required.' }
  const redirectUrl = stringValue(data.redirectUrl)
  if (redirectUrl !== undefined) {
    try {
      const url = new URL(redirectUrl)
      if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('unsupported protocol')
    } catch {
      return { ok: false, error: 'Redirect URL must be an absolute http(s) URL.' }
    }
  }
  const emailAlias = stringValue(data.emailAlias)?.toLowerCase()
  if (emailAlias !== undefined && !INTAKE_ALIAS_PATTERN.test(emailAlias))
    return { ok: false, error: 'Email alias must be 2–64 lowercase URL-safe characters.' }
  const defaultAssigneeIds = idListValue(data.defaultAssigneeIds)
  const notifyUserIds = idListValue(data.notifyUserIds)
  const notifyGroupIds = idListValue(data.notifyGroupIds)
  if (defaultAssigneeIds === undefined || notifyUserIds === undefined || notifyGroupIds === undefined)
    return { ok: false, error: 'Routing selections are invalid.' }

  return {
    ok: true,
    data: {
      name,
      key,
      active: booleanValue(data.active, true),
      allowedOrigins: origins.value,
      requireTurnstile: booleanValue(data.requireTurnstile, true),
      defaultOwner: optionalId(data.defaultOwnerId),
      defaultAssignees: defaultAssigneeIds,
      defaultSource: optionalId(data.defaultSourceId),
      notifyUsers: notifyUserIds,
      notifyGroups: notifyGroupIds,
      successMessage,
      redirectUrl: redirectUrl ?? null,
      emailAlias: emailAlias ?? null,
    },
  }
}

export function randomServerKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `intake_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
