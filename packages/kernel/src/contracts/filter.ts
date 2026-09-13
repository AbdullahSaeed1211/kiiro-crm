/** Comparison operators supported by every persistence adapter. */
export type FilterOperator = 'eq' | 'neq' | 'in' | 'nin' | 'contains' | 'like' | 'gt' | 'gte' | 'lt' | 'lte' | 'exists'

/** A single field comparison. */
export interface FilterCondition {
  readonly field: string
  readonly op: FilterOperator
  readonly value: unknown
}

/** Adapter-independent query filter tree. */
export type FilterNode =
  { readonly and: readonly FilterNode[] } | { readonly or: readonly FilterNode[] } | FilterCondition

/** Sort order for list queries. */
export type SortSpec = readonly { readonly field: string; readonly direction: 'asc' | 'desc' }[]

/** A page of results. */
export interface Page<T> {
  readonly items: readonly T[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}
