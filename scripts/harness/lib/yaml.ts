/**
 * Minimal YAML subset for `harness/config.yaml` and lesson front matter: block maps, block lists of scalars or
 * nested blocks, flow lists of scalars, quoted and plain strings, integers, booleans, null and `#` comments.
 */
export type YamlValue = string | number | boolean | null | YamlValue[] | { [key: string]: YamlValue }

interface Line {
  indent: number
  text: string
  lineNo: number
}

interface Parsed {
  value: YamlValue
  next: number
}

function nextQuote(quote: string, ch: string): string {
  if (quote === '') return ch === "'" || ch === '"' ? ch : ''
  return ch === quote ? '' : quote
}

/** Removes a trailing `# comment` that sits outside quotes. */
function stripComment(raw: string): string {
  let quote = ''
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charAt(i)
    quote = nextQuote(quote, ch)
    if (quote === '' && ch === '#' && (i === 0 || /\s/.test(raw.charAt(i - 1)))) return raw.slice(0, i)
  }
  return raw
}

function toLines(text: string): Line[] {
  return text.split(/\r?\n/).flatMap((raw, index) => {
    const body = stripComment(raw).trimEnd()
    if (body.trim() === '' || body.trim() === '---') return []
    return [{ indent: body.length - body.trimStart().length, text: body.trim(), lineNo: index + 1 }]
  })
}

function splitFlowItems(inner: string): string[] {
  const items: string[] = []
  let quote = ''
  let current = ''
  for (const ch of inner) {
    quote = nextQuote(quote, ch)
    if (quote === '' && ch === ',') {
      items.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim() !== '') items.push(current.trim())
  return items
}

const ESCAPES: Record<string, string> = { n: '\n', t: '\t' }
const LITERALS: Record<string, YamlValue> = { true: true, false: false, null: null, '~': null }

function isQuoted(t: string): boolean {
  return t.length >= 2 && (t.startsWith("'") || t.startsWith('"')) && t.endsWith(t.charAt(0))
}

function parseQuoted(text: string): string {
  if (text.startsWith("'")) return text.slice(1, -1).replaceAll("''", "'")
  return text.slice(1, -1).replace(/\\(["\\nt])/g, (_m, c: string) => ESCAPES[c] ?? c)
}

type ScalarRule = [(t: string) => boolean, (t: string) => YamlValue]

const SCALAR_RULES: ScalarRule[] = [
  [(t) => t.startsWith('[') && t.endsWith(']'), (t) => splitFlowItems(t.slice(1, -1)).map(parseScalar)],
  [(t) => t === '{}', () => ({})],
  [isQuoted, parseQuoted],
  [(t) => /^-?\d+$/.test(t), (t) => Number.parseInt(t, 10)],
  [(t) => Object.hasOwn(LITERALS, t), (t) => LITERALS[t] ?? null],
]

/** Parses one scalar or flow list; anything unrecognised is a plain string. */
export function parseScalar(text: string): YamlValue {
  const t = text.trim()
  const rule = SCALAR_RULES.find(([test]) => test(t))
  return rule === undefined ? t : rule[1](t)
}

function quotedKeySplit(text: string): [string, string] | undefined {
  const quote = text.charAt(0)
  if (quote !== "'" && quote !== '"') return undefined
  const close = text.indexOf(quote, 1)
  const rest = close > 0 ? text.slice(close + 1) : ''
  return rest.startsWith(':') ? [parseQuoted(text.slice(0, close + 1)), rest.slice(1).trim()] : undefined
}

function plainKeySplit(text: string): [string, string] | undefined {
  const match = /:(?:\s|$)/.exec(text)
  if (match === null || match.index === 0) return undefined
  return [text.slice(0, match.index).trim(), text.slice(match.index + 1).trim()]
}

/** Splits `key: value` into its key and raw value, honouring quoted keys such as `'check:scope':`. */
function splitKey(line: Line): [string, string] {
  const split = quotedKeySplit(line.text) ?? plainKeySplit(line.text)
  if (split === undefined) throw new Error(`YAML line ${String(line.lineNo)}: expected "key: value"`)
  return split
}

function isListItem(line: Line, indent: number): boolean {
  return line.indent === indent && (line.text === '-' || line.text.startsWith('- '))
}

function parseChild(lines: Line[], index: number, parentIndent: number): Parsed {
  const next = lines[index]
  if (next === undefined) return { value: null, next: index }
  if (next.indent > parentIndent) return parseBlock(lines, index, next.indent)
  return isListItem(next, parentIndent) ? parseList(lines, index, parentIndent) : { value: null, next: index }
}

function isMapEntry(text: string): boolean {
  if (isQuoted(text) || text.startsWith('[') || text.startsWith('{')) return false
  return (quotedKeySplit(text) ?? plainKeySplit(text)) !== undefined
}

/** One `- ` item: a nested block, an inline map (`- key: value` with aligned keys below) or a scalar. */
function parseListItem(lines: Line[], index: number, line: Line): Parsed {
  const rest = line.text.slice(1).trim()
  if (rest === '') return parseChild(lines, index + 1, line.indent)
  if (!isMapEntry(rest)) return { value: parseScalar(rest), next: index + 1 }
  const itemIndent = line.indent + line.text.length - rest.length
  lines[index] = { ...line, indent: itemIndent, text: rest }
  return parseMap(lines, index, itemIndent)
}

function parseList(lines: Line[], start: number, indent: number): Parsed {
  const items: YamlValue[] = []
  let index = start
  let line = lines[index]
  while (line !== undefined && isListItem(line, indent)) {
    const parsed = parseListItem(lines, index, line)
    items.push(parsed.value)
    index = parsed.next
    line = lines[index]
  }
  return { value: items, next: index }
}

function parseMap(lines: Line[], start: number, indent: number): Parsed {
  const map: Record<string, YamlValue> = {}
  let index = start
  let line = lines[index]
  while (line?.indent === indent && !isListItem(line, indent)) {
    const [key, raw] = splitKey(line)
    const parsed = raw === '' ? parseChild(lines, index + 1, indent) : { value: parseScalar(raw), next: index + 1 }
    map[key] = parsed.value
    index = parsed.next
    line = lines[index]
  }
  return { value: map, next: index }
}

function parseBlock(lines: Line[], start: number, indent: number): Parsed {
  const first = lines[start]
  return first !== undefined && isListItem(first, indent)
    ? parseList(lines, start, indent)
    : parseMap(lines, start, indent)
}

/** Parses a YAML document in the supported subset; throws on lines it cannot place. */
export function parseYaml(text: string): YamlValue {
  const lines = toLines(text)
  const first = lines[0]
  if (first === undefined) return null
  const parsed = parseBlock(lines, 0, first.indent)
  const leftover = lines[parsed.next]
  if (leftover !== undefined) throw new Error(`YAML line ${String(leftover.lineNo)}: unexpected indentation`)
  return parsed.value
}

const PLAIN = /^[A-Za-z_][\w./@-]*$/

function formatScalar(value: string | number | boolean | null): string {
  if (typeof value !== 'string') return String(value)
  return PLAIN.test(value) && !Object.hasOwn(LITERALS, value) ? value : `'${value.replaceAll("'", "''")}'`
}

function stringifyEntry(prefix: string, value: YamlValue, indent: string): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${prefix} []`]
    return [prefix, ...value.flatMap((item) => stringifyEntry(`${indent}  -`, item, `${indent}    `))]
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return [`${prefix} {}`]
    return [prefix, ...entries.flatMap(([k, v]) => stringifyEntry(`${indent}  ${formatScalar(k)}:`, v, `${indent}  `))]
  }
  return [`${prefix} ${formatScalar(value)}`]
}

/** Serialises a map of scalars, lists and nested maps into the parseable subset. */
export function stringifyYaml(value: Record<string, YamlValue>): string {
  const lines = Object.entries(value).flatMap(([k, v]) => stringifyEntry(`${formatScalar(k)}:`, v, ''))
  return `${lines.join('\n')}\n`
}
