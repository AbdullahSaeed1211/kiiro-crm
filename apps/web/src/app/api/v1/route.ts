import { ok } from '@ops/kernel'
import { apiIndex } from '../../../server/api/contracts'
import { apiRoute } from '../../../server/api/http'

export const dynamic = 'force-dynamic'

/** Lists every product API endpoint with its JSON body schema, so the API describes itself. */
export const GET = apiRoute(() => Promise.resolve(ok({ endpoints: apiIndex() })))
