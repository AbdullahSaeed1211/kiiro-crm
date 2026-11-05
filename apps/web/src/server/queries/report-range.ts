const DAY_MS = 86_400_000
const RANGE_KEYS = ['7d', '30d', '90d', 'ytd', 'custom'] as const

export type ReportRangeKey = (typeof RANGE_KEYS)[number]

export interface ReportRange {
  readonly key: ReportRangeKey
  readonly from: number
  readonly to: number
  readonly fromDate: string
  readonly toDate: string
  /** Why a custom range could not be applied, so the page can say so instead of quietly showing another range. */
  readonly problem?: 'invalid' | 'reversed'
  /** What the person typed, kept in the fields while `problem` is set. */
  readonly entered?: { readonly from: string; readonly to: string }
}

function dateString(value: number): string {
  return new Date(value).toISOString().slice(0, 10)
}

function startOfDay(value: number): number {
  const date = new Date(value)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** A real calendar day. `2026-02-31` is refused, not read as March 3. */
function validDate(value: unknown): number | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed) && dateString(parsed) === value ? parsed : undefined
}

function customProblem(input: {
  from: number | undefined
  to: number | undefined
}): 'invalid' | 'reversed' | undefined {
  if (input.from === undefined || input.to === undefined) return 'invalid'
  return input.from > input.to ? 'reversed' : undefined
}

const enteredText = (value: unknown): string => (typeof value === 'string' ? value.slice(0, 10) : '')

function rangeKey(value: unknown): ReportRangeKey {
  return typeof value === 'string' && RANGE_KEYS.includes(value as ReportRangeKey) ? (value as ReportRangeKey) : '30d'
}

/** Resolves a bounded reporting range from URL state, defaulting to the last 30 calendar days. */
// eslint-disable-next-line complexity -- the five preset branches are intentionally explicit and mutually exclusive.
export function resolveReportRange(
  input: {
    readonly range?: unknown
    readonly from?: unknown
    readonly to?: unknown
    readonly now?: number
  } = {},
): ReportRange {
  const now = input.now ?? Date.now()
  const today = startOfDay(now)
  const key = rangeKey(input.range)
  const customFrom = validDate(input.from)
  const customTo = validDate(input.to)
  const presets: Record<Exclude<ReportRangeKey, 'custom'>, number> = {
    '7d': 6,
    '30d': 29,
    '90d': 89,
    ytd: Math.floor((today - Date.UTC(new Date(today).getUTCFullYear(), 0, 1)) / DAY_MS),
  }
  const presetDays = key === 'custom' ? presets['30d'] : presets[key]
  const presetFrom = today - presetDays * DAY_MS
  const problem = key === 'custom' ? customProblem({ from: customFrom, to: customTo }) : undefined
  const custom = key === 'custom' && customFrom !== undefined && customTo !== undefined && problem === undefined
  const from = custom ? customFrom : presetFrom
  const to = custom ? customTo + DAY_MS : today + DAY_MS
  const range = { key, from, to, fromDate: dateString(from), toDate: dateString(to - DAY_MS) }
  if (problem === undefined) return range
  return { ...range, problem, entered: { from: enteredText(input.from), to: enteredText(input.to) } }
}
