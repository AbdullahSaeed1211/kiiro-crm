---
name: add-api-endpoint
description: Use when exposing a module use case on the ops-platform product API (/api/v1) - a registry entry, a thin route file, and curl gates.
---

# Add an API endpoint

Every endpoint is one entry in the contract registry plus a route file that calls an existing module command. The registry is the single source for the route's body validation and for the `GET /api/v1` index, so the documentation cannot drift from what the route enforces. Rules are in spec §12.3 and ADR-0004.

## Steps

1. Make sure the use case exists as a module command with a zod schema in the module (`packages/modules/<module>/src/schema*`), exported from the module's `index.ts`. If not, follow the `add-use-case` skill first.
2. Add an entry to `API_CONTRACTS` in `apps/web/src/server/api/contracts.ts`:
   - id `<resource>.<verb>`, for example `tasks.move`;
   - `method` and `path` with `:param` segments, under `/api/v1/<resource>`;
   - a one-sentence `summary` that says what the call does;
   - `body`: the module schema, with path params removed through `.omit({ taskId: true })`;
   - `success`: 200, or 201 for a create.
3. Add the route at `apps/web/src/app/api/v1/<resource>/.../route.ts`, following `apps/web/src/app/api/v1/tasks/[id]/route.ts`:

   ```ts
   export const dynamic = 'force-dynamic'

   export const POST = apiRoute<{ id: string }>(async ({ request, params, context }) => {
     const body = await contractBody(request, 'tasks.move')
     return body.ok ? moveTask(await getWorkCommandDeps(context), { ...body.value, taskId: params.id }) : body
   })
   ```

   `apiRoute` handles the session (401), the status mapping (spec §12.1), and logging of unexpected exceptions. The handler returns the module's `Result`; it holds no business rules and never imports Payload (`routes-no-payload` fails otherwise). Pass the success status as the second argument for creates: `apiRoute(handler, 201)`.
4. If the module needs dependencies the deps builder cannot yet take from an explicit context, give the builder an optional `RequestContext` parameter, as `getWorkCommandDeps` does. Never call `getProductContext` from an API route: it redirects instead of returning 401.
5. Update the endpoint list sentence in spec §12.3 when you add a new resource.

## Done when

- `curl -s -b /tmp/ops.jar localhost:3001/api/v1` lists the endpoint with its body schema.
- The gates from the `verify-change` skill pass: the success path returns the registry status, invalid input returns 400 with `error.fields`, an unknown id returns 404, a stale `expectedUpdatedAt` returns 409, and no session returns 401.
- The static gates pass, including `knip` (unused exports) and `depcruise`.
