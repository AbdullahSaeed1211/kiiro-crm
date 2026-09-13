/** Approximate glob overlap: "could one path match both patterns?" (supports `*`, `?`, `**`, one-level `{a,b}`). */

/** Expands one level of `{a,b}` alternatives. */
export function expandBraces(pattern: string): string[] {
  const match = /\{([^{}]*)\}/.exec(pattern)
  if (match === null) return [pattern]
  const head = pattern.slice(0, match.index)
  const tail = pattern.slice(match.index + match[0].length)
  return (match[1] ?? '').split(',').flatMap((option) => expandBraces(`${head}${option}${tail}`))
}

/** Turns a scope entry or glob into path segments; a trailing `/` means "everything below". */
export function toSegments(pattern: string): string[] {
  const clean = pattern.trim().replace(/^`|`$/g, '').replace(/^\.\//, '')
  const withDir = clean.endsWith('/') ? `${clean}**` : clean
  return withDir.split('/').filter((segment) => segment !== '')
}

const hasWildcard = (segment: string): boolean => /[*?]/.test(segment)

function segmentRegex(segment: string): RegExp {
  const source = segment
    .split('')
    .map((ch) => {
      if (ch === '*') return '[^/]*'
      if (ch === '?') return '[^/]'
      return ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    })
    .join('')
  return new RegExp(`^${source}$`)
}

function segmentsOverlap(a: string, b: string): boolean {
  if (!hasWildcard(a)) return segmentRegex(b).test(a)
  if (!hasWildcard(b)) return segmentRegex(a).test(b)
  const prefix = (s: string): string => s.slice(0, s.search(/[*?]/))
  const suffix = (s: string): string => s.slice(Math.max(s.lastIndexOf('*'), s.lastIndexOf('?')) + 1)
  const [pa, pb, sa, sb] = [prefix(a), prefix(b), suffix(a), suffix(b)]
  return (pa.startsWith(pb) || pb.startsWith(pa)) && (sa.endsWith(sb) || sb.endsWith(sa))
}

/** `star` starts with `**`, which matches zero segments or consumes one segment of `other`. */
function starOverlap(star: string[], other: string[]): boolean {
  return overlapSegments(star.slice(1), other) || (other.length > 0 && overlapSegments(star, other.slice(1)))
}

function overlapSegments(a: string[], b: string[]): boolean {
  if (a[0] === '**') return starOverlap(a, b)
  if (b[0] === '**') return starOverlap(b, a)
  const [headA, headB] = [a[0], b[0]]
  if (headA === undefined || headB === undefined) return headA === headB
  return segmentsOverlap(headA, headB) && overlapSegments(a.slice(1), b.slice(1))
}

/** True when some path could match both patterns. */
export function globsOverlap(a: string, b: string): boolean {
  return expandBraces(a).some((ea) => expandBraces(b).some((eb) => overlapSegments(toSegments(ea), toSegments(eb))))
}

/** True when any pattern in `left` overlaps any pattern in `right`. */
export function anyOverlap(left: string[], right: string[]): boolean {
  return left.some((a) => right.some((b) => globsOverlap(a, b)))
}
