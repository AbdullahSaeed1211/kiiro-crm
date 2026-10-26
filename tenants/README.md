# Tenants

Each customer business ("tenant") is one `<slug>.jsonc` file validated by
[`scripts/lib/tenant-schema.ts`](../scripts/lib/tenant-schema.ts). This directory ships only
[`example.jsonc`](example.jsonc), a placeholder tenant ("Acme Agency" on `example.com`) used for local
development, tests and the committed `apps/web/wrangler.jsonc`.

## Keep real tenants out of this repository

Real tenant files contain customer domains, Cloudflare resource ids, mail addresses and brand assets.
Keep them in a separate private directory or repository and point the tooling at it:

```sh
export KIIRO_TENANTS_DIR=../my-tenants   # absolute, or relative to the repository root
pnpm gen:wrangler
pnpm tenant:provision <slug> --dry-run
```

Every tenant script (`gen:wrangler`, `tenants:deploy`, `tenant:new`, `tenant:provision`, `tenant:backup`,
`check:brand`, `check:isolation`) reads `$KIIRO_TENANTS_DIR` and falls back to this directory when it is
unset. `brandAssets.logoPath` and `faviconPath` are resolved relative to the tenants directory, for example
`assets/<slug>/logo.png`.

`.gitignore` rejects any `tenants/*.jsonc` other than `example.jsonc` and any `tenants/assets/*` other than
`assets/example/`, so a real tenant cannot be committed here by accident. Do not commit an
`apps/web/wrangler.jsonc` generated from real tenants; run `pnpm gen:wrangler` without `KIIRO_TENANTS_DIR`
to restore the placeholder version.

## Deploying from CI

`.github/workflows/deploy.yml` checks out the private tenants repository named by the `TENANTS_REPO`
variable into `.tenants/` with the `TENANTS_REPO_TOKEN` secret, sets `KIIRO_TENANTS_DIR=.tenants` and
regenerates the Wrangler config before deploying. Per-tenant internal secrets come from the
`TENANT_INTERNAL_SECRETS` secret, one `INTERNAL_SECRET_<SLUG>=<value>` line per tenant.
