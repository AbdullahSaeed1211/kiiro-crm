# Deploy tenants

Use the tagged deployment loop to release one build to every tenant in `deployOrder`. The loop records a D1 restore bookmark, applies migrations, deploys the Worker, runs smoke checks, and stops at the first failure.

## Local drill

The deployment command is a dry run unless `--execute` and `OPS_ALLOW_LIVE=1` are both present. Run the normal preview before a release:

```sh
pnpm tenants:deploy --tag v0.0.0
```

Exercise the failure path locally with an injected health failure:

```sh
pnpm tenants:deploy --tag v0.0.0 --fail-smoke
```

The drill must print the rollback command for the first tenant and must not run migration, deployment, or smoke commands for later tenants.

## Tagged release

The GitHub workflow runs only for tags matching `v*`. It installs the pinned dependencies, runs the complete `pnpm verify` gate, builds the OpenNext artifact once with the web workspace executable, verifies `apps/web/.open-next/worker.js` and its assets, and invokes the loop. The workflow supplies the Cloudflare credentials and the explicit live-operation guard.

For an operator-run release, use the same sequence after reviewing the build. The shell needs Cloudflare credentials for Wrangler and, for every tenant, `INTERNAL_SECRET_<SLUG>` (the slug upper-cased with `-` as `_`, for example `INTERNAL_SECRET_ACME_CO`), taken from operator custody. Without it the authenticated R2 and email smoke probes cannot run, smoke fails with `authenticated probe not run: set INTERNAL_SECRET_<SLUG>`, and the loop rolls the tenant back.

```sh
pnpm verify
pnpm --filter web exec opennextjs-cloudflare build
test -f apps/web/.open-next/worker.js && test -d apps/web/.open-next/assets
OPS_ALLOW_LIVE=1 pnpm tenants:deploy --tag vX.Y.Z --execute
```

For each tenant, the loop runs:

```text
pnpm --filter web exec wrangler d1 time-travel info <database> --env <slug>
CLOUDFLARE_ENV=<slug> pnpm --filter web exec payload migrate
pnpm --filter web exec opennextjs-cloudflare deploy --env=<slug>
pnpm tenant:smoke <slug> --execute
```

### Tenant-configured email capability

Outbound email is controlled by `email.enabled` in `tenants/<slug>.jsonc`. When it is `false`, Wrangler generation sets
`MAIL_TRANSPORT=disabled`; the settings page, record email actions, password-reset action, and send API all present the
same unavailable state, while inbound inbox history remains readable. The smoke harness records email as
`disabled by tenant configuration` and does not call the provider. When it is `true`, the email probe remains required and
any failed probe still fails the deployment and triggers the code-only rollback.

Re-enabling a tenant is the forward path: set `email.enabled` to `true`, onboard and verify the configured sender domain
with Cloudflare Email Sending, refresh the operator token with the `email_sending` scope, regenerate Wrangler config, and
rerun the tagged deployment. Never bypass the smoke gate by treating an enabled-but-unavailable sender as disabled.

## Failure handling

After a restore bookmark exists, any migration, deploy, or smoke failure runs a code-only rollback:

```text
pnpm --filter web exec wrangler rollback --name ops-<slug> --message "<tag> failed smoke" --yes
```

The loop records the bookmark, marks the tenant failed, blocks later tenants, and exits nonzero. Code rollback preserves bindings and data. It never restores D1 data automatically.

## Release evidence

Record the tag, tenant status, restore bookmark, smoke check results, rollback result when applicable, and the command exit code. Keep credentials, cookies, intake payloads, and email bodies out of the evidence.
