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

The GitHub workflow runs only for tags matching `v*`. It installs the pinned dependencies, runs the complete `pnpm verify` gate, builds the OpenNext artifact once with the web workspace executable, verifies `apps/web/.open-next/worker.js` and its assets, and invokes the loop. The workflow supplies the Cloudflare credentials and the explicit live-operation guard. It invokes the loop only when the `production` environment has `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and a current `INTERNAL_SECRET_<SLUG>` for every tenant; without them it verifies and builds, prints a notice and skips the deploy, so an operator-run release is not repeated by CI.

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

The deploy's email probe sends one message to `email.probeRecipient` in the tenant file. When that is unset the probe sends nothing and passes, so no customer receives test mail; set it to an address the operator owns.

Re-enabling a tenant is the forward path: set `email.enabled` to `true`, onboard and verify the configured sender domain
with Cloudflare Email Sending, refresh the operator token with the `email_sending` scope, regenerate Wrangler config, and
rerun the tagged deployment. Never bypass the smoke gate by treating an enabled-but-unavailable sender as disabled.

## Turning on text messages for a tenant

Texting is on for a tenant when all three Worker secrets exist, and off otherwise; no manifest or redeploy setting is involved. With the customer's Twilio account SID, auth token and sending number (international form, like `+15550100`):

```sh
cd apps/web
printf '%s' "$SID"   | npx wrangler secret put TWILIO_ACCOUNT_SID --env <slug>
printf '%s' "$TOKEN" | npx wrangler secret put TWILIO_AUTH_TOKEN --env <slug>
printf '%s' "$FROM"  | npx wrangler secret put TWILIO_FROM_NUMBER --env <slug>
```

Open any record with a phone number: the Text button should appear. To check without sending a real text, set the account SID to `console` in a local `.dev.vars`; texts are then logged, not sent. Removing any one of the three secrets turns texting off again.

## Rotating a tenant's internal secret

Cloudflare stores Worker secrets write-only, so a lost `INTERNAL_SECRET` cannot be read back; rotate it instead. The Worker's cron and inbound-email bridges read the same binding, so a custom-host tenant needs nothing else. A platform-host tenant's copy in `ops-mail-router` (`INTERNAL_SECRET_<SLUG>`) must be updated too, and so must any CI secret of the same name.

```sh
umask 077 && mkdir -p ~/.ops-secrets
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64url'))" > ~/.ops-secrets/<slug>.internal
printf 'export INTERNAL_SECRET_<SLUG>="$(cat ~/.ops-secrets/<slug>.internal)"\n' > ~/.ops-secrets/<slug>.env
cd apps/web && npx wrangler secret put INTERNAL_SECRET --env <slug> < ~/.ops-secrets/<slug>.internal
```

When the latest uploaded version is not the deployed one, for example after a rolled-back release, `secret put` refuses. Use `npx wrangler versions secret put INTERNAL_SECRET --env <slug>` instead: it stores the secret on a new version without deploying it, and the next release's upload inherits it. Then run the release with `source ~/.ops-secrets/<slug>.env` in the same shell.

## Failure handling

After a restore bookmark exists, any migration, deploy, or smoke failure runs a code-only rollback:

```text
pnpm --filter web exec wrangler rollback --name ops-<slug> --message "<tag> failed smoke" --yes
```

The loop records the bookmark, marks the tenant failed, blocks later tenants, and exits nonzero. Code rollback preserves bindings and data. It never restores D1 data automatically.

## Release evidence

Record the tag, tenant status, restore bookmark, smoke check results, rollback result when applicable, and the command exit code. Keep credentials, cookies, intake payloads, and email bodies out of the evidence.

## Capacity checks

What was measured, so a change can be compared against it (2026-10-02).

- **Production, concurrent users.** `crm.mirchmedia.com` with about 2,500 demo records: 10 signed-in users making 140 page and API requests took 14.8 s with no failures (median 0.86 s, 95th percentile 1.9 s); 30 users making 420 requests took 23.5 s with no failures (median 1.4 s, 95th percentile 2.9 s, slowest 3.8 s).
- **Local, large data.** About 12,000 tasks, 4,100 leads, 2,900 deals, 2,300 contacts and 960 organizations on the dev server: Dashboard, My tasks, lists, Timeline and the settings screens load in under a second; the lead, deal and task boards and the Calendar take 2.6 to 4.5 s; Figures for 30 days takes about 3.6 s and for 90 days 7 to 10 s. These are dev-server times on a busy laptop, so a deployed Worker should be faster.
- **Production, 100 users at once.** 100 users hitting the site together with no pause between requests (a harsher test than 100 real people): 800 requests, none failed, median 3.7 s, 95th percentile 7.3 s, slowest 9.4 s. Slower, but nothing broke.
- **Production, sustained.** 20 users with a short pause between requests for 4 minutes: 1,777 requests, none failed, median about 0.87 s and 95th percentile 1.6 to 1.8 s in every minute, with no slowing over time.
- **Local, very large data.** About 47,000 tasks, 17,500 leads, 12,400 deals, 8,700 contacts and 2,800 organizations: Dashboard, My tasks, the lead, deal, organization, contact and task lists, and Timeline load in 0.4 to 1.8 s; the lead and task boards take 3.6 to 4.2 s. The Calendar (35 s) and Figures (30 s) were slow only because the copied data puts every task in the same month and period; real data spreads out over time. The Projects list takes 9 s with 2,400 projects, because it reads every project name before paging, which only matters far beyond what an agency has.
- **Big-data page costs (before and after, local, 52,000 tasks, 19,000 leads, 13,000 deals).** Opening a lead 43.6 s to 0.8 s; opening a deal 11.7 s to 0.4 s; creating a subtask 188 s to 0.2 s; the tasks API's first page 208 s to 0.05 s; the projects API from an error after 40 s to 1.1 s. These came from reading every task, lead or contact for a job that needs a handful.
- **Tasks list sorting (local, 37,000 tasks, 2026-10-02).** Sorting by due date, title, priority (both ways), stage, with a search, and the My tasks view each load in 0.3 to 0.9 s, including deep pages (page 300 and 700). Before this change any sort except due date read every task first.
- **Not measured.** Runs of many hours, and a real database with years of history from a live business.
