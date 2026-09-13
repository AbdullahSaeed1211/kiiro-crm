# Spike measurement data

Raw measurements for the M1 spike report (spec §0.9, "Runtime measurements"), taken on a deployed tenant by the lead. Scripts live in `scripts/spike/`. Workers do not run them against Cloudflare.

## Output files

Each run writes `docs/spike-data/<metric>-<env>-<timestamp>.json`:

- `<metric>` is `startup`, `latency` or `analytics`.
- `<env>` is the `--env` value.
- `<timestamp>` is the UTC start time in ISO 8601 basic format, for example `20260913T142233Z`.

Every file records its percentile method: nearest rank, the value at rank ceil(p × n / 100). The median is p50.

Pass `--out-dir <dir>` to write elsewhere. Pass `--dry-run` to print every command, request and file write without running anything; tokens and cookies print as `[redacted]`.

Before committing, run `pnpm exec prettier --write docs/spike-data`: `format:check` covers this directory, and Prettier reflows the number arrays.

## Order of runs

Run from the repository root, after M1-L3 has built and deployed the tenant. Wrangler must be logged in to the account.

1. Startup time plus cold first-request latency, over 5 uploads. Each run uploads a version and parses `Worker Startup Time: <n> ms`. With `--deploy`, it then deploys that version at 100%, waits `--settle-ms` (default 15000), and times one GET to `--cold-url`:
   ```sh
   pnpm exec tsx scripts/spike/startup.ts --env staging-a --count 5 --deploy --cold-url https://<worker-host>/login
   ```
2. Warm latency, 200 sequential requests per path, right after step 1. The default client is `curl -w '%{http_code} %{time_total}'`; `--client fetch` uses `fetch` with `performance.now()`. A status outside 2xx and 3xx stops the run.
   ```sh
   pnpm exec tsx scripts/spike/latency.ts --env staging-a --base-url https://<worker-host> --path /login --path /api/v1/health
   pnpm exec tsx scripts/spike/latency.ts --env staging-a --base-url https://<worker-host> --path /tasks --header 'Cookie: <session cookie>'
   pnpm exec tsx scripts/spike/latency.ts --env staging-a --base-url https://<worker-host> --path /tasks --method POST \
     --header 'Cookie: <session cookie>' --header 'Next-Action: <action id>' --data '<action body>'
   ```
   Add `--cold --count 0` to time only a first request after a deploy made some other way.
3. Analytics, at least 5 minutes after step 2, so the GraphQL data has arrived. Set `--start` to a time just before step 1. Export `CLOUDFLARE_API_TOKEN` (Account Analytics Read) and `CLOUDFLARE_ACCOUNT_ID` first.
   ```sh
   pnpm exec tsx scripts/spike/analytics.ts --env staging-a --start <ISO instant> \
     --script ops-staging-a --database-id <D1 database uuid> --bucket ops-staging-a
   ```
   D1 counts come in whole UTC hours: `datetimeHour` buckets starting at the hour of `--start`. Keep other traffic off the tenant during that hour.
4. Bundle size: `pnpm size`.

To check reproducibility, repeat steps 1 and 2. Medians should stay within ±20%.
