type Row = Readonly<Record<string, unknown>>

/** Workers totals over the window; top-level quantiles only when the window returned exactly one group. */
export interface WorkersMetrics {
  readonly groups: number
  readonly requests: number
  readonly errors: number
  readonly subrequests: number
  readonly cpuTimeP50: number | null
  readonly cpuTimeP99: number | null
  readonly quantilesByGroup: readonly { readonly cpuTimeP50: number | null; readonly cpuTimeP99: number | null }[]
}

/** D1 sums over the hour buckets the window touches. */
export interface D1Metrics {
  readonly hours: readonly string[]
  readonly readQueries: number
  readonly writeQueries: number
  readonly rowsRead: number
  readonly rowsWritten: number
}

/** R2 operation counts, in total and per action type. */
export interface R2Metrics {
  readonly requests: number
  readonly byActionType: Readonly<Record<string, number>>
}

function isRow(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function get(value: unknown, ...keys: readonly string[]): unknown {
  return keys.reduce<unknown>((current, key) => (isRow(current) ? current[key] : undefined), value)
}

const numberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null)
const sumOf = (rows: readonly Row[], key: string): number =>
  rows.reduce((total, row) => total + (numberOrNull(get(row, 'sum', key)) ?? 0), 0)

/** Rows of `dataset` in the first account of a GraphQL Analytics response; throws on GraphQL errors or another shape. */
export function datasetRows(response: unknown, dataset: string): Row[] {
  const errors = get(response, 'errors')
  if (Array.isArray(errors) && errors.length > 0) {
    const messages = errors.map((error: unknown) => String(get(error, 'message')))
    throw new Error(`GraphQL errors for ${dataset}: ${messages.join('; ')}`)
  }
  const accounts = get(response, 'data', 'viewer', 'accounts')
  const rows = Array.isArray(accounts) ? get(accounts[0], dataset) : undefined
  if (!Array.isArray(rows)) throw new Error(`GraphQL response has no data.viewer.accounts[0].${dataset} array`)
  return rows.filter(isRow)
}

/** Parses a `workersInvocationsAdaptive` response. */
export function parseWorkers(response: unknown): WorkersMetrics {
  const rows = datasetRows(response, 'workersInvocationsAdaptive')
  const quantilesByGroup = rows.map((row) => ({
    cpuTimeP50: numberOrNull(get(row, 'quantiles', 'cpuTimeP50')),
    cpuTimeP99: numberOrNull(get(row, 'quantiles', 'cpuTimeP99')),
  }))
  const only = quantilesByGroup.length === 1 ? quantilesByGroup[0] : undefined
  return {
    groups: rows.length,
    requests: sumOf(rows, 'requests'),
    errors: sumOf(rows, 'errors'),
    subrequests: sumOf(rows, 'subrequests'),
    cpuTimeP50: only?.cpuTimeP50 ?? null,
    cpuTimeP99: only?.cpuTimeP99 ?? null,
    quantilesByGroup,
  }
}

/** Parses a `d1AnalyticsAdaptiveGroups` response. */
export function parseD1(response: unknown): D1Metrics {
  const rows = datasetRows(response, 'd1AnalyticsAdaptiveGroups')
  return {
    hours: rows.map((row) => String(get(row, 'dimensions', 'datetimeHour'))),
    readQueries: sumOf(rows, 'readQueries'),
    writeQueries: sumOf(rows, 'writeQueries'),
    rowsRead: sumOf(rows, 'rowsRead'),
    rowsWritten: sumOf(rows, 'rowsWritten'),
  }
}

/** Parses an `r2OperationsAdaptiveGroups` response. */
export function parseR2(response: unknown): R2Metrics {
  const byActionType: Record<string, number> = {}
  for (const row of datasetRows(response, 'r2OperationsAdaptiveGroups')) {
    const action = String(get(row, 'dimensions', 'actionType'))
    byActionType[action] = (byActionType[action] ?? 0) + (numberOrNull(get(row, 'sum', 'requests')) ?? 0)
  }
  return { requests: Object.values(byActionType).reduce((total, count) => total + count, 0), byActionType }
}
