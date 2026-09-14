# Onboard a customer tenant

Use this procedure to onboard a service business into an isolated platform-hosted instance. The platform operator owns the Cloudflare account, Worker, D1 database, R2 bucket, email configuration, and secrets. The customer receives users inside its tenant and never receives platform credentials.

## Platform prerequisites

Confirm these items once before onboarding:

- Cloudflare Workers Paid is active in the platform operator account.
- `PLATFORM_DOMAIN` is active in that account's DNS.
- Email Sending is onboarded for `notify.<PLATFORM_DOMAIN>`.
- Email Routing has `in.<PLATFORM_DOMAIN>` and a catch-all rule to `ops-mail-router`.
- The operator token is scoped to Workers Scripts, D1, R2, Email Service, Email Routing, and DNS for the platform zone.
- GitHub has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.

## Customer prerequisites

Collect the owner name and email, team roles and reporting lines, website origins and form-handler access, CSV exports, branding assets, display name, timezone, currency, locale, and template choice. A `sensitive` template requires its privacy approval before go-live.

## Provision the instance

1. Add `tenants/<slug>.jsonc` with `hostType: "platform"`, a host under `PLATFORM_DOMAIN`, unique resources, and the customer's intake origins.
2. Validate the plan without network access:

```sh
pnpm tenant:provision <slug> --dry-run
```

3. Set the per-customer `TURNSTILE_SECRET_<SLUG>` in the operator environment.
4. Run the authorized provisioning procedure in `docs/runbooks/provision-tenant.md`.
5. Run `pnpm gen:wrangler`, deploy `ops-mail-router`, and run the tenant smoke checks.

## Set up the owner

The owner accepts the invitation and sets a password. The owner then completes the onboarding wizard for workspace name, branding, template, team, and intake. Import CSVs in this order: organizations, contacts, projects, open tasks, and leads. Send a test email from the email settings page.

## Cut over website leads

1. Point each server-side form handler at `https://<slug>.<PLATFORM_DOMAIN>/api/v1/intake/<formKey>` with its server key, or use a browser submission with Turnstile.
2. Keep the existing notification path active for seven days.
3. Submit a test lead from every website. Confirm the lead, source, and notification in the tenant.
4. Remove the old notification path only after seven clean days.

## Pilot checks

During the first week, compare form submission counts with tenant leads, move active projects and open tasks into the app, verify staff login and My Tasks usage, confirm no cross-tenant visibility, and verify due-soon and overdue notifications. Record customer friction separately from deployment evidence.

## Rollback boundary

If the platform is unhealthy, keep the existing notification path active and follow `docs/runbooks/rollback.md`. Code rollback is automatic after a failed deployment smoke check. D1 data restore always requires explicit operator approval.
