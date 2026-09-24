# Refresh the local client workspace

Run `pnpm seed:dev` from the repository root to refresh the existing local D1 workspace in place. The script refuses production or remote Cloudflare environments. It matches existing client organizations and their project and task records so a refresh keeps their record IDs.

## Procedure

1. Confirm the local preview is using the workspace under `apps/web/.wrangler`.
2. Run the local seed:

   ```sh
   pnpm seed:dev
   ```

3. Open the local app and confirm there are ten client organizations, ten planned projects, and twenty open tasks. Contacts, leads, and deals remain empty until verified client information is available.
4. Run `pnpm seed:dev` a second time when checking idempotence. Collection counts should stay the same.

The seed removes old reserved-domain example contacts, leads, deals, unrelated organizations, and generic projects and tasks from this local workspace. It does not reset the D1 database. Do not use `pnpm db:reset:local` for a routine refresh because it removes the local D1 state directory before applying migrations.

## Data rules

Keep the ten organization names supplied by the owner. Fill public website and business contact fields only when a verified client-owned source supports them. Leave unknown fields empty. Do not add personal contacts, pipeline history, deal amounts, or activity that the owner has not provided. Keep project work in `Planned` and task work in `To do` until the owner confirms scope and progress.
