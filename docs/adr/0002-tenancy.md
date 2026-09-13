# ADR-0002: Tenancy

Status: accepted · Date: 2026-09-13

## Context

Customers are service businesses that expect their data to be separate from other customers'. The operator runs the platform; customers never own platform infrastructure.

## Decision

Each customer tenant gets its own Worker, D1 database, R2 bucket and settings, generated from `tenants/<slug>.jsonc`, all in the platform operator's Cloudflare account. Tenants are hosted at `<slug>.<PLATFORM_DOMAIN>`; customer-owned domains come later through Cloudflare for SaaS custom hostnames (D-49). There is no shared-row multitenancy.

## Consequences

Isolation is structural and must be proven by test (spec §19.5). Deployments iterate over tenants with a canary first. Cron triggers and zone email domains have account limits that shape later scaling (spec §11, §14.4).

## Alternatives considered

Shared database with tenant ids (weaker isolation, harder white-label guarantees); Workers for Platforms (unnecessary below roughly 200 tenants).
