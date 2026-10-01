import { failure } from '../../../../server/api/respond'

export const dynamic = 'force-dynamic'

const unknown = (): Response =>
  failure('NOT_FOUND', 'There is no such endpoint. GET /api/v1/openapi.json lists them all.')

/** Any path under /api/v1 that no endpoint serves answers in the same shape as every other failure. */
export const GET = unknown
export const POST = unknown
export const PUT = unknown
export const PATCH = unknown
export const DELETE = unknown
