# Back up and restore a tenant

Each tenant's records live in its own D1 database and its files in its own R2 bucket. Cloudflare keeps D1 history for point-in-time restore; a dated export held outside Cloudflare protects against mistakes that history cannot undo, such as a deleted database.

## What is protected already

- **D1 time travel** restores the database to any minute in the last 30 days. Read the current bookmark before a risky change and restore with the commands in [rollback](rollback.md).
- **Archive** hides a record without deleting it, and Settings, Archive restores it.

## Take an export

Run from `ops-platform` with the operator environment loaded (`set -a; . ~/.ops-secrets/<slug>.env; set +a`):

```sh
mkdir -p ~/backups/<slug>
pnpm --filter web exec wrangler d1 export ops-<slug> --remote --env <slug> --output ~/backups/<slug>/$(date +%F).sql
```

The file holds every record, user and setting, including password hashes and webhook signing secrets. Store it encrypted, outside the repository, and keep the last 30 daily exports plus one a month.

For files, copy the bucket with any S3-compatible client pointed at `https://<account-id>.r2.cloudflarestorage.com` and the bucket `ops-<slug>`, using an R2 token scoped to read that bucket.

## Restore

- **A mistake in the last 30 days:** use D1 time travel; no export is needed.
- **A lost database:** create a new database with the same name, `pnpm --filter web exec wrangler d1 execute ops-<slug> --remote --env <slug> --file <export.sql>`, put its id in `tenants/<slug>.jsonc`, run `pnpm gen:wrangler`, then deploy and run the smoke checks in [deploy](deploy.md).

Restoring replaces data, so the operator approves it explicitly, and a restore is rehearsed on a throwaway tenant before it is needed.
