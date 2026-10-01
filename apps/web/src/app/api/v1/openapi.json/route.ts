import { openApiDocument } from '../../../../server/api/openapi'

export const dynamic = 'force-dynamic'

/** The product API described in OpenAPI 3.1, for generating clients and checking integrations. */
export function GET(request: Request): Response {
  return Response.json(openApiDocument(new URL(request.url).origin), {
    headers: { 'cache-control': 'public, max-age=300' },
  })
}
