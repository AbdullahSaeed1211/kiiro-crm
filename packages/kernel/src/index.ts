/** Public API of @ops/kernel. */
export type { Clock, DomainError, ErrorCode, Id, Logger, LogFields, Result } from './contracts/result'
export type { FilterCondition, FilterNode, FilterOperator, Page, SortSpec } from './contracts/filter'
export { domainError, err, isOk, ok } from './lib/result'
export { asId, createJsonLogger, fixedClock, newId, redact, systemClock } from './lib/runtime'
