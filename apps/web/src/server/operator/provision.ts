import { createHash } from 'node:crypto'

export function previewTenantPlan(input: Readonly<{ slug: string; displayName: string }>) {
  const idempotencyKey = createHash('sha256').update(`${input.slug}:${input.displayName}`).digest('hex').slice(0, 32)
  const plan = [
    'validate tenant definition',
    'allocate isolated D1 database',
    'allocate isolated R2 bucket',
    'generate tenant bindings',
    'install scoped secrets',
    'apply migrations',
    'deploy verified artifact',
    'seed settings, template and owner invitation',
    'verify sender and routing',
    'run smoke checks',
  ].map((label, index) => ({ key: `step-${String(index + 1)}`, label }))
  return { idempotencyKey, plan }
}
