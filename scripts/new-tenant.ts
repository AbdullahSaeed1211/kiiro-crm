import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import { TEMPLATE_KEYS } from '../packages/templates/src/index'
import { parseJsonc } from './lib/jsonc'
import { isMain, runCli } from './lib/report'
import { parseTenant, type Tenant } from './lib/tenant-schema'

const USAGE =
  'usage: pnpm tenant:new <slug> --name "Business name" --owner-email <email> --owner-name "Name" [--template <key>] [--timezone <zone>] [--currency <ISO>] [--locale en|es] [--host <hostname>]'

/** The tenants already on disk, read raw so one invalid file does not stop a new one being added. */
function existingTenants(root: string): Record<string, unknown>[] {
  const dir = join(root, 'tenants')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.jsonc'))
    .map((file) => parseJsonc(readFileSync(join(dir, file), 'utf8')) as Record<string, unknown>)
}

/** The numbers of every rate-limit namespace and deploy order in use, so a new tenant takes the next free ones. */
function nextFree(tenants: readonly Record<string, unknown>[]): { namespace: number; order: number } {
  const namespaces = tenants.flatMap((tenant) => {
    const ids = tenant['rateLimitNamespaces'] as Record<string, string> | undefined
    return ids === undefined ? [] : Object.values(ids).map(Number)
  })
  const orders = tenants.map((tenant) => Number(tenant['deployOrder'] ?? 0))
  return { namespace: Math.max(1000, ...namespaces) + 1, order: Math.max(-1, ...orders) + 1 }
}

interface Choices {
  readonly slug: string
  readonly name: string
  readonly ownerEmail: string
  readonly ownerName: string
  readonly platformDomain: string
  readonly template: string
  readonly timezone: string
  readonly currency: string
  readonly locale: string
  readonly host: string | undefined
}

/** A complete tenant definition from the few answers a new business gives; resource names follow the slug. */
function draftTenant(choices: Choices, free: { namespace: number; order: number }): unknown {
  const { slug, platformDomain } = choices
  return {
    slug,
    displayName: choices.name,
    hostType: choices.host === undefined ? 'platform' : 'custom',
    host: choices.host ?? `${slug}.${platformDomain}`,
    template: choices.template,
    timezone: choices.timezone,
    locale: choices.locale,
    currency: choices.currency,
    owner: { email: choices.ownerEmail, name: choices.ownerName },
    email: {
      enabled: true,
      fromName: choices.name,
      fromAddress: `no-reply@notify.${platformDomain}`,
      inboundDomain: `in.${platformDomain}`,
      inboundLocalPrefix: `${slug}--`,
    },
    d1: { name: `ops-${slug}` },
    r2: { bucket: `ops-${slug}` },
    rateLimitNamespaces: { intake: String(free.namespace), auth: String(free.namespace + 1) },
    intake: { allowedOrigins: [], turnstileHostnames: [] },
    deployOrder: free.order,
  }
}

function choicesFrom(argv: string[]): Choices {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      name: { type: 'string' },
      'owner-email': { type: 'string' },
      'owner-name': { type: 'string' },
      template: { type: 'string', default: 'agency' },
      timezone: { type: 'string', default: 'UTC' },
      currency: { type: 'string', default: 'USD' },
      locale: { type: 'string', default: 'en' },
      host: { type: 'string' },
    },
  })
  const slug = positionals[0]
  const platformDomain = process.env['PLATFORM_DOMAIN']
  if (slug === undefined || values.name === undefined || values['owner-email'] === undefined) throw new Error(USAGE)
  if (platformDomain === undefined || platformDomain === '') throw new Error('PLATFORM_DOMAIN is not set')
  if (!(TEMPLATE_KEYS as readonly string[]).includes(values.template)) {
    throw new Error(`unknown template "${values.template}"; choose one of ${TEMPLATE_KEYS.join(', ')}`)
  }
  return {
    slug,
    name: values.name,
    ownerEmail: values['owner-email'],
    ownerName: values['owner-name'] ?? values.name,
    platformDomain,
    template: values.template,
    timezone: values.timezone,
    currency: values.currency.toUpperCase(),
    locale: values.locale,
    host: values.host,
  }
}

/** Writes `tenants/<slug>.jsonc` for a new business and prints the commands that provision it. */
export function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const root = process.cwd()
  const choices = choicesFrom(argv)
  const file = join(root, 'tenants', `${choices.slug}.jsonc`)
  if (existsSync(file)) throw new Error(`tenants/${choices.slug}.jsonc already exists`)
  const draft = draftTenant(choices, nextFree(existingTenants(root)))
  const tenant: Tenant = parseTenant(draft, `tenants/${choices.slug}.jsonc`)
  writeFileSync(file, `${JSON.stringify(tenant, null, 2)}\n`)
  console.log(`tenant:new: wrote tenants/${choices.slug}.jsonc`)
  console.log(`next: pnpm tenant:provision ${choices.slug} --dry-run, then follow docs/runbooks/onboarding-customer.md`)
  return Promise.resolve(0)
}

if (isMain(import.meta.url)) runCli(main)
