---
name: verify-change
description: Use before calling any change done in ops-platform - run the static gates, exercise the behavior against the running app with curl, and record the checks as gates in the commit body.
---

# Verify a change

A change is done when the static gates pass and its behavior has been observed in the running app. Tests are not the default proof; see "When a test is still required" below.

## 1. Static gates (about a minute)

```sh
for s in format:check typecheck lint depcruise knip jscpd check:brand check:vocab check:disables check:docs test; do
  pnpm -s $s > /tmp/gate-$s.log 2>&1 || echo "FAILED $s (see /tmp/gate-$s.log)"
done
```

Fix every failure; never add a lint waiver to get past one. `pnpm verify` adds integration tests, the build and the size check before merging.

## 2. Run the app and sign in

```sh
PORT=3001 pnpm dev > /tmp/dev.log 2>&1 &   # port 3000 may belong to another project
EMAIL=$(npx tsx -e "import { USERS } from './scripts/seed/data'; console.log(USERS.find((u) => u.role === 'owner')?.email)")
PW=$(npx tsx -e "import { DEV_PASSWORD } from './scripts/seed/data'; console.log(DEV_PASSWORD)")
curl -s -c /tmp/ops.jar -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" http://localhost:3001/api/v1/auth/login
curl -s -b /tmp/ops.jar http://localhost:3001/api/v1 | jq '.data.endpoints[] | {id, method, path}'
```

A 401 on login means the local database is not seeded: run `pnpm db:reset:local && pnpm seed:dev`. Unexpected exceptions are logged to `/tmp/dev.log` as `server action failed` lines with the stack.

## 3. Exercise the behavior as gates

Write each check as a gate: the command, the expected outcome, and what you observed. Cover the success path and each failure the change touches.

```
G1 invalid input names the field
  CHECK:  curl -s -b /tmp/ops.jar -H 'content-type: application/json' -d '{"title":""}' localhost:3001/api/v1/tasks
  EXPECT: 400, error.code VALIDATION, error.fields.title set
  SAW:    400 {"ok":false,"error":{"code":"VALIDATION",...,"fields":{"title":"Enter a title."}}}
G2 stale version conflicts
  CHECK:  curl ... -X PATCH -d '{"expectedUpdatedAt":1,"patch":{"title":"x"}}' localhost:3001/api/v1/tasks/<id>
  EXPECT: 409 CONFLICT
  SAW:    409
```

For a UI change, also load the affected pages with the cookie jar (`curl -s -b /tmp/ops.jar -o /dev/null -w '%{http_code}' localhost:3001/<route>`, expect 200) and look at them in a browser at 1440px and 390px when layout changed. Tailwind classes built at runtime do not render; check the element's computed style when you change class tables.

Records you create while checking live only in the local database. Name them so they are recognizable, for example "API gate check task".

## 4. Record the gates

Put the gates under `Verified:` in the commit body, one line each (`G1 invalid task title -> 400 with fields.title`). Commits that change behavior without gates are not done.

## When a test is still required

Only for a bug that neither a response nor a type reveals:

- removed validation that still returns `ok`,
- a lost side effect, such as an activity or stage-transition row that is never written,
- a permission or tenant-scope leak,
- a race between two writers.

When you change code that an existing test covers only by restating a schema, a config value or the mechanics of the old implementation, delete that test in the same commit instead of rewriting it. Keep tests that guard the four cases above.

Write a new one through the module's in-memory double (`packages/modules/crm/test/memory-crm.ts`, `packages/modules/work/test/memory-work.ts`), make it fail before the fix, and commit it with the fix. Never test config literals, source text, tenant values or code nothing calls.
