# Architecture

The authoritative specification is `docs/spec.md`. This page is the short map.

## Layers
```mermaid
flowchart TD
  app[apps/web: Next.js + Payload composition root] --> adapters
  adapters[packages/adapters: payload, cloudflare] --> modules
  modules[packages/modules: crm, work, intake, mail] --> platform
  platform[packages/platform: domain-agnostic building blocks] --> kernel[packages/kernel]
  ui[packages/ui: shadcn + composites] --> kernel
  app --> ui
```

## Per-tenant deployment
```mermaid
flowchart LR
  browser[Browser] --> worker[Worker ops-slug]
  worker --> d1[(D1 ops-slug)]
  worker --> r2[(R2 ops-slug)]
  worker --> email[Email Service]
  router[ops-mail-router] --> worker
```

## Request lifecycle
Browser request → Worker (OpenNext) → Next.js route or Server Action → session actor → module command through ports → Payload adapter (access filter, unit of work) → D1/R2 → activity and events → response.
