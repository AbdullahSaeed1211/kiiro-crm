# Roll back a tenant

Use this procedure when a deployment fails after its smoke checks or when an operator decides that the previous Worker version must serve traffic. Code rollback is reversible and does not alter D1 data.

## Code rollback

1. Identify the tenant Worker and the failed release tag from the deployment output.
2. Confirm the deployment loop already stopped later tenants. If it did not, stop the release workflow before continuing.
3. Run the code-only rollback command for the failed tenant:

```sh
pnpm --filter web exec wrangler rollback --name ops-<slug> --message "<tag> failed smoke" --yes
```

4. Rerun the smoke checks against the restored version. Verify health, login, the R2 put/get/delete probe, and the test email.
5. Keep the recorded D1 bookmark with the incident. Do not restore data as part of code rollback.

## D1 data restore

Data restore is a destructive, human-approved action. Only the platform operator may authorize it after confirming the affected tenant, bookmark, data-loss window, and customer communication. A code rollback must be attempted first when it addresses the incident.

After approval, run the exact command below with the recorded bookmark:

```sh
pnpm --filter web exec wrangler d1 time-travel restore ops-<slug> --bookmark <bookmark> --env <slug>
```

Run migrations and smoke checks after the restore. Record the operator, approval, bookmark, command result, and verification output. Never guess a bookmark and never restore a different tenant's database.

## Recovery boundary

Migrations must remain backward-compatible with the previous Worker version. If the previous version cannot read the current schema, stop and escalate to the platform operator. Do not edit a migration or retry a restore against another database to bypass that boundary.
