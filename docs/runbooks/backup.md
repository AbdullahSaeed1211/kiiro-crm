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
- **A lost database:** create a new database with the same name and run the migrations on it (`pnpm tenants:deploy` does this), so every table, index and the search index with its triggers exist and are empty. Then run `pnpm tenant:restore <slug> ~/backups/<slug>/<date>`. It refuses to run unless the target has no users, loads the tables in foreign-key order (tables that point at each other, such as leads and deals, go in one request), skips `payload_migrations`, and the triggers refill the search index. Put the new database id in `tenants/<slug>.jsonc`, run `pnpm gen:wrangler`, then deploy and run the smoke checks in [deploy](deploy.md). Rehearsed on 2026-10-02 end to end on a throwaway tenant in the real Cloudflare account: provision (new D1 database, R2 bucket, secrets, all migrations, deploy), then `pnpm tenant:restore` of the production export of `mirchmedia`. It took 45 steps with no errors, all 46 table row counts matched the manifest, the search index came back with 730 rows through its 18 triggers, and a second restore into a non-empty database is refused. The throwaway Worker, database and bucket were deleted afterwards.

Restoring replaces data, so the operator approves it explicitly, and a restore is rehearsed on a throwaway tenant before it is needed.
