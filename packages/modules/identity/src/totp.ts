const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const STEP_SECONDS = 30
const DIGITS = 6
const SECRET_BYTES = 20
const RECOVERY_CODES = 8
const RECOVERY_BYTES = 5
/** A code is accepted from the step before to the step after the current one, for clocks that drift a little. */
const DRIFT_STEPS = 1

function base32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET.charAt((value >>> (bits - 5)) & 31)
      bits -= 5
    }
  }
  return bits > 0 ? out + ALPHABET.charAt((value << (5 - bits)) & 31) : out
}

function fromBase32(text: string): Uint8Array<ArrayBuffer> {
  const bytes: number[] = []
  let bits = 0
  let value = 0
  for (const char of text.toUpperCase().replaceAll(/[\s=-]/gu, '')) {
    const index = ALPHABET.indexOf(char)
    if (index < 0) throw new Error('not a base32 secret')
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Uint8Array.from(bytes)
}

/** A new shared secret, as the base32 text an authenticator app takes. */
export function generateTotpSecret(): string {
  return base32(crypto.getRandomValues(new Uint8Array(SECRET_BYTES)))
}

async function codeForStep(secret: string, step: number): Promise<string> {
  const counter = new DataView(new ArrayBuffer(8))
  counter.setUint32(0, Math.floor(step / 2 ** 32))
  counter.setUint32(4, step >>> 0)
  const key = await crypto.subtle.importKey('raw', fromBase32(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const mac = new DataView(await crypto.subtle.sign('HMAC', key, counter))
  const offset = mac.getUint8(mac.byteLength - 1) & 15
  const binary = mac.getUint32(offset) & 0x7f_ff_ff_ff
  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0')
}

/** True when `code` is the secret's code for the current 30-second step or the one on either side (RFC 6238). */
export async function verifyTotp(secret: string, code: string, nowMs: number): Promise<boolean> {
  const trimmed = code.replaceAll(/\s/gu, '')
  if (!/^\d{6}$/u.test(trimmed)) return false
  const current = Math.floor(nowMs / 1000 / STEP_SECONDS)
  for (let drift = -DRIFT_STEPS; drift <= DRIFT_STEPS; drift += 1) {
    if ((await codeForStep(secret, current + drift)) === trimmed) return true
  }
  return false
}

/** The address an authenticator app imports to add the account. */
export function otpauthUri(input: {
  readonly secret: string
  readonly account: string
  readonly issuer: string
}): string {
  const label = encodeURIComponent(`${input.issuer}:${input.account}`)
  const query = new URLSearchParams({ secret: input.secret, issuer: input.issuer, digits: String(DIGITS) })
  return `otpauth://totp/${label}?${query.toString()}`
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const normalize = (code: string): string => code.replaceAll(/[\s-]/gu, '').toLowerCase()

/** One-time codes for a lost phone: shown once as `xxxxx-xxxxx`, kept only as hashes. */
export async function newRecoveryCodes(): Promise<{ readonly plain: string[]; readonly hashes: string[] }> {
  const plain = Array.from({ length: RECOVERY_CODES }, () => {
    const hex = [...crypto.getRandomValues(new Uint8Array(RECOVERY_BYTES))]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    return `${hex.slice(0, 5)}-${hex.slice(5)}`
  })
  return { plain, hashes: await Promise.all(plain.map((code) => sha256Hex(normalize(code)))) }
}

/** The stored hash that `code` matches, so the caller can remove it after use; null when none does. */
export async function matchRecoveryCode(code: string, hashes: readonly string[]): Promise<string | null> {
  const hash = await sha256Hex(normalize(code))
  return hashes.find((candidate) => candidate === hash) ?? null
}
