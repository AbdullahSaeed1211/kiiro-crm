/** True for text shaped like name@host.tld; checked by position, not a pattern, so odd input cannot make it slow. */
export function looksLikeEmail(text: string): boolean {
  const at = text.indexOf('@')
  const dot = text.lastIndexOf('.')
  return at > 0 && at === text.lastIndexOf('@') && dot > at + 1 && dot < text.length - 1 && !/\s/u.test(text)
}

/** The addresses typed in a To box, split on commas, semicolons and spaces, lower-cased, without repeats. */
export function addressesOf(text: string): string[] {
  const parts = text
    .split(/[\s,;]+/u)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(parts)]
}
