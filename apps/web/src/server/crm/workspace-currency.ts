function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function withCurrency(parent: unknown, currency: string): unknown {
  const record = recordOf(parent)
  const value = record === undefined ? undefined : recordOf(record.value)
  return value === undefined ? parent : { ...record, value: { ...value, currency } }
}

export function applyWorkspaceCurrency(input: unknown, currency: string, nested = false): unknown {
  const record = recordOf(input)
  if (!nested || record === undefined) return withCurrency(input, currency)
  return { ...record, deal: withCurrency(record.deal, currency) }
}
