# Provision a tenant

Use this procedure to create one isolated tenant instance. The command validates the tenant definition, creates its D1 database and R2 bucket when absent, generates Wrangler bindings, uploads secrets, applies migrations, deploys the existing build, seeds the tenant, checks sender status when outbound email is enabled, prints the manual checklist, and runs smoke checks.

## Before you start

Confirm that the tenant file exists at `tenants/<slug>.jsonc` and contains a unique slug, D1 name, R2 bucket, rate-limit namespaces, owner, sender, inbound domain, and intake origins. Set `email.enabled` explicitly to `false` when Email Sending is not available; the tenant schema rejects malformed hosts, email addresses, UUIDs, URLs, and namespace ids.

Tenant branding is declared with `brandAssets`. Use HTTPS `logoUrl`/`faviconUrl` sources for operator-managed defaults, or `logoPath`/`faviconPath` for packaged tenant assets checked into `tenants/assets/<slug>/`. Packaged assets are encoded into the authenticated seed request, validated for supported image type and size, then stored in that tenant's R2 bucket. The first seed fills missing logo/favicon keys only; reruns preserve operator uploads and never delete configured objects. Record the source and intended dimensions in release evidence when changing a tenant's artwork.

For local validation, use the dry run. It contacts no Cloudflare service and never creates a secret file.

```sh
pnpm tenant:provision <slug> --dry-run
```

For an authorized operator run, provide `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `TURNSTILE_SECRET_<SLUG>` in the process environment. The command also accepts `TURNSTILE_SECRET` as a fallback for a one-tenant operator shell.

## Procedure

1. Run `pnpm gen:wrangler` and inspect both generated files. The web Worker environment must contain only the tenant's D1, R2, service, email, rate-limit, and variable bindings. The mail router must contain a service binding only for platform-hosted tenants.
2. Run `OPS_ALLOW_LIVE=1 INTERNAL_SECRET_<SLUG>=<custodied-secret> pnpm tenant:provision <slug> --execute` from the repository root. On a fresh tenant, omit `INTERNAL_SECRET_<SLUG>` and the command generates it into the temporary secret file; retain that value in secure operator custody for every rerun. If remote secrets already exist and the variable is absent, provisioning stops before mutations with an explicit custody error. The command writes a D1 id to the tenant file when Wrangler creates the database. Temporary secret files are mode `0600` and removed after each command.
3. Complete the printed checklist. Confirm the custom domain, Email Routing catch-all, Turnstile hostnames, and mail-router deployment for a platform-hosted tenant.
4. Save the command output with the release evidence. Do not copy secret values into logs, tickets, or reports.

## Rerun behavior

Reruns are safe when the operator re-supplies the tenant `INTERNAL_SECRET_<SLUG>` from secure custody. A tenant file with a D1 id skips D1 creation. The executable path checks exact R2 rows, D1 databases, tenant and mail-router secret names, generated configuration, and authenticated remote status before running steps. An interruption after secret upload without the custodied secret fails before migrations or deployment; rerun after resolving that prerequisite and retain the existing resource ids. Payload migration, tenant seeding, sender status persistence, router-secret synchronization, and smoke probes are idempotent operations. A disabled email capability skips sender verification and accepts the explicit disabled smoke state; it does not send a probe.

## Expected result

The command exits with code 0 only after all steps complete. A failed command exits nonzero and includes the failed step without printing credentials or request bodies.
