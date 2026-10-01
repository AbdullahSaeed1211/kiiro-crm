const MIN_LENGTH = 12
const MAX_LENGTH = 128
const MIN_DISTINCT = 5
const MIN_NAME_LENGTH = 4

/** Passwords that are long enough to pass a length check and are still in every attacker's first guesses. */
const COMMON = new Set([
  'passwordpassword',
  'password1234',
  'password12345',
  'password123456',
  'qwertyuiop12',
  'qwertyuiopasdf',
  'qwerty123456',
  'letmein123456',
  'welcome12345',
  'welcome123456',
  'administrator',
  'admin1234567',
  'changeme1234',
  'changemenow',
  '123456789012',
  '1234567890123',
  'iloveyou1234',
  'abcdefghijkl',
  'abc123456789',
])

const squash = (value: string): string => value.toLowerCase().replaceAll(/[^a-z0-9]/gu, '')

function aboutEmail(password: string, email: string): string | undefined {
  if (password.toLowerCase() === email.toLowerCase()) return 'Password must not equal the email address.'
  const name = squash(email.split('@')[0] ?? '')
  return name.length >= MIN_NAME_LENGTH && squash(password).includes(name)
    ? 'Password must not contain the name from the email address.'
    : undefined
}

function aboutPassword(password: string): string | undefined {
  if (password.length < MIN_LENGTH || password.length > MAX_LENGTH)
    return `Password must be ${String(MIN_LENGTH)} to ${String(MAX_LENGTH)} characters.`
  if (new Set(password).size < MIN_DISTINCT) return 'Password repeats too few different characters.'
  return COMMON.has(squash(password)) ? 'That password is too common. Choose something harder to guess.' : undefined
}

/** Why a password may not be set, or undefined when it is acceptable. Existing passwords are never re-checked. */
export function passwordProblem(password: string, email?: string): string | undefined {
  return aboutPassword(password) ?? (email === undefined ? undefined : aboutEmail(password, email))
}
