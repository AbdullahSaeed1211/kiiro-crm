import type { FilterNode, FilterOperator } from '@ops/kernel'
import type { Operator, Where } from 'payload'

const OPERATORS: Readonly<Record<FilterOperator, Operator>> = {
  eq: 'equals',
  neq: 'not_equals',
  in: 'in',
  nin: 'not_in',
  contains: 'contains',
  like: 'like',
  gt: 'greater_than',
  gte: 'greater_than_equal',
  lt: 'less_than',
  lte: 'less_than_equal',
  exists: 'exists',
}

/** Converts an adapter-independent filter tree into a Payload `Where` clause. */
export function toWhere(node: FilterNode): Where {
  if ('and' in node) return { and: node.and.map(toWhere) }
  if ('or' in node) return { or: node.or.map(toWhere) }
  return { [node.field]: { [OPERATORS[node.op]]: node.value } }
}

/** ANDs a scope filter into an optional Payload query; without a scope the query is returned unchanged. */
export function withScope(where: Where | undefined, scope: FilterNode | undefined): Where | undefined {
  if (scope === undefined) return where
  const scoped = toWhere(scope)
  return where === undefined ? scoped : { and: [where, scoped] }
}
