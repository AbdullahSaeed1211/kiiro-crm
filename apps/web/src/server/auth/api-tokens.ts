import type { Payload } from 'payload'
import type { User } from '../../payload-types'

const CONTEXT = { authOperation: 'privateFields' } as const
const SECRET_BYTES = 24
const MAX_TOKENS = 10
const TOUCH_AFTER_MS = 60 * 60 * 1000
const PREFIX = 'ops_'

/** A stored token: the secret itself is never kept, only its SHA-256. */
interface StoredToken {
  readonly id: string
  readonly name: string
  readonly hash: string
  readonly createdAt: number
  readonly lastUsedAt: number | null
}

/** What the Profile page may show about a token. */
export type ApiTokenSummary = Omit<StoredToken, 'hash'>

const hex = (bytes: Uint8Array): string => [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

async function sha256(text: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))))
}

function storedOf(user: User): StoredToken[] {
  const raw: unknown = user.apiTokens
  return Array.isArray(raw)
    ? raw.filter(
        (item): item is StoredToken =>
          typeof item === 'object' && item !== null && typeof (item as StoredToken).hash === 'string',
      )
    : []
}

async function save(payload: Payload, userId: string, tokens: readonly StoredToken[]): Promise<void> {
  await payload.update({
    collection: 'users',
    id: userId,
    data: { apiTokens: [...tokens] },
    depth: 0,
    overrideAccess: true,
    context: CONTEXT,
  })
}

const load = (payload: Payload, userId: string): Promise<User> =>
  payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true })

/** The user's tokens without their hashes, newest first. */
export async function listApiTokens(payload: Payload, userId: string): Promise<ApiTokenSummary[]> {
  const tokens = storedOf(await load(payload, userId))
  return tokens
    .map(({ id, name, createdAt, lastUsedAt }) => ({ id, name, createdAt, lastUsedAt }))
    .toSorted((a, b) => b.createdAt - a.createdAt)
}

/** Makes a token and returns it; this is the only time its secret is visible. `null` when the user has too many. */
export async function createApiToken(
  payload: Payload,
  input: { userId: string; name: string },
): Promise<string | null> {
  const tokens = storedOf(await load(payload, input.userId))
  if (tokens.length >= MAX_TOKENS) return null
  const secret = hex(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)))
  const record: StoredToken = {
    id: crypto.randomUUID(),
    name: input.name,
    hash: await sha256(secret),
    createdAt: Date.now(),
    lastUsedAt: null,
  }
  await save(payload, input.userId, [...tokens, record])
  return `${PREFIX}${input.userId}.${secret}`
}

/** Removes a token; it stops working at once. */
export async function revokeApiToken(payload: Payload, input: { userId: string; tokenId: string }): Promise<void> {
  const tokens = storedOf(await load(payload, input.userId))
  await save(
    payload,
    input.userId,
    tokens.filter((token) => token.id !== input.tokenId),
  )
}

function parse(token: string): { userId: string; secret: string } | null {
  const match = /^ops_(?<userId>[0-9a-f-]{36})\.(?<secret>[0-9a-f]{48})$/u.exec(token)
  return match?.groups === undefined ? null : { userId: match.groups.userId, secret: match.groups.secret }
}

/** The active user a token belongs to, or null for an unknown, revoked or malformed one. */
export async function userForApiToken(payload: Payload, token: string): Promise<User | null> {
  const parsed = parse(token)
  if (parsed === null) return null
  const user = await load(payload, parsed.userId).catch(() => null)
  if (user?.active !== true) return null
  const hash = await sha256(parsed.secret)
  const tokens = storedOf(user)
  const found = tokens.find((candidate) => candidate.hash === hash)
  if (found === undefined) return null
  if (found.lastUsedAt === null || Date.now() - found.lastUsedAt > TOUCH_AFTER_MS) {
    await save(
      payload,
      user.id,
      tokens.map((candidate) => (candidate.id === found.id ? { ...candidate, lastUsedAt: Date.now() } : candidate)),
    )
  }
  return user
}
