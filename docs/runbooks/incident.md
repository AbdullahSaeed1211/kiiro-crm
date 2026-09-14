# Respond to a tenant operations incident

Use this procedure when provisioning, deployment, smoke checks, routing, or a tenant Worker reports an error. The goals are to contain the affected tenant, preserve evidence, and restore service without changing unrelated tenants.

## Triage

1. Capture the tenant slug, Worker name, release tag, UTC time, request id when available, failing route, status code, and the exact failing step.
2. Check whether the deployment loop stopped. A failed tenant blocks later tenants in that release; do not manually continue the loop until the failed tenant is understood.
3. Treat a missing or invalid internal secret, cross-tenant binding, unexpected data visibility, or credential exposure as a security incident. Stop and escalate immediately.
4. Confirm that the website's old notification path remains active during the onboarding overlap. This keeps lead capture available while the platform is investigated.

## Deployment failure

If a restore bookmark exists, verify that the loop issued a code-only rollback and preserved the bookmark. Follow `docs/runbooks/rollback.md` for smoke verification. Do not restore D1 data automatically.

## Provisioning failure

Rerun the dry run first, then inspect the failed resource check. Preserve the tenant file's D1 id and resource names. Rerun the authorized provisioning command after the operator resolves the failed prerequisite. The provisioning steps are idempotent and must not be replaced with ad hoc resource creation.

## Tenant isolation concern

Stop traffic or deployment for the affected tenant when safe, preserve logs without secrets or payloads, and notify the platform operator. Compare the generated web and mail-router configuration with the tenant file. Confirm that the tenant has only its own D1, R2 bucket, rate-limit namespaces, and service binding. Do not attempt to repair isolation by editing generated files.

## Closure

Close the incident only after the affected tenant passes all smoke checks, later tenants are either deployed from the same tag or intentionally held, and the evidence identifies the cause, containment, recovery, and follow-up check.
