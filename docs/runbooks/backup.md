# Back up and restore a tenant

Each tenant's records live in its own D1 database and its files in its own R2 bucket. Cloudflare keeps D1 history for point-in-time restore; a dated export held outside Cloudflare protects against mistakes that history cannot undo, such as a deleted database.

## What is protected already

- **D1 time travel** restores the database to any minute in the last 30 days. Read the current bookmark before a risky change and restore with the commands in [rollback](rollback.md).
- **Archive** hides a record without deleting it, and Settings, Archive restores it.

## Take an export

Cloudflare's own `wrangler d1 export` of a whole database fails here ("cannot export databases with Virtual Tables (fts5)") because of the workspace search index. `pnpm tenant:backup` exports table by table instead and skips the search index, which is derived data. Run from `ops-platform` with the operator environment loaded:

```sh
set -a; . ~/.ops-secrets/<slug>.env; set +a
pnpm tenant:backup <slug> --verify
```

It writes one data-only `.sql` file per table, `schema.sql` with the CREATE statements, plus `manifest.json` with the live row counts, to `~/backups/<slug>/<date>/` (private to your user). With `--verify` it loads every file into a throwaway SQLite database and compares row counts with the live ones; any difference is printed and the command exits 1. It takes about three minutes and only reads the live database. Last drill: 2026-10-02, `mirchmedia`, 47 tables, every row count matched.

The files hold every record, user and setting, including password hashes and webhook signing secrets. Store them encrypted, outside the repository, and keep the last 30 daily exports plus one a month.

For files, copy the bucket with any S3-compatible client pointed at `https://<account-id>.r2.cloudflarestorage.com` and the bucket `ops-<slug>`, using an R2 token scoped to read that bucket.

## Restore

- **A mistake in the last 30 days:** use D1 time travel; no export is needed.
- **A lost database:** create a new database with the same name and run the migrations on it (`pnpm tenants:deploy` does this). That creates every table, index and the search index with its triggers. Then load the data files, leaving out `schema.sql` and `payload_migrations.sql` (the migrations already recorded themselves): `for f in ~/backups/<slug>/<date>/*.sql; do ...; done` running `pnpm --filter web exec wrangler d1 execute ops-<slug> --remote --env <slug> --file "$f"` for each. The data files only insert rows, and the triggers refill the search index as the rows arrive. Put the new database id in `tenants/<slug>.jsonc`, run `pnpm gen:wrangler`, then deploy and run the smoke checks in [deploy](deploy.md). Rehearsed on 2026-10-02 into a freshly migrated local database with the production export: no errors, 135 leads and 10 users restored, and 730 search rows rebuilt. Loading into a new remote D1 database is the same steps with `--remote`, but has not been run.

Restoring replaces data, so the operator approves it explicitly, and a restore is rehearsed on a throwaway tenant before it is needed.
