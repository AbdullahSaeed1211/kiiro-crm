# ADR-0001: Foundation

Status: accepted · Date: 2026-09-13

## Context
The platform is a white-label CRM and project operations product deployed as an isolated instance per customer tenant. The operator prefers Cloudflare and open source, needs authentication, access control, an admin back office, uploads and an API without building them from scratch, and requires permissive licensing so the product can remain proprietary.

## Decision
Build on Payload 3 (MIT) with Next.js 16 through the OpenNext Cloudflare adapter, running on Cloudflare Workers with D1 and R2. Frappe CRM, Twenty, Plane, Huly, Corteza and Odoo are behavior references only. The M1 spike decides GO or FALLBACK with measured evidence.

## Consequences
Workers Paid is required. Payload's D1 adapter is beta, so transaction behavior, startup time against the 1-second limit and relationship queries are validated in M1. Payload admin serves owners and managers; the product UI is a custom Next.js app.

## Alternatives considered
Fallback on a FALLBACK result: Vite React SPA + Hono + Better Auth + Drizzle on D1/R2. Rejected as the product foundation: forking Frappe CRM (AGPL, Python/MariaDB stack), Twenty (AGPL, Postgres/Redis), Plane (AGPL, many services), Huly (8 GB minimum), Laravel on Railway (per-tenant server cost).
