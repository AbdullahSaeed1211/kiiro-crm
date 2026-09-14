import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Tenant } from '../tenant-schema'

/** Writes a newly created D1 id to the owning tenant file. */
export function updateTenantD1Id(root: string, tenant: Tenant, id: string): void {
  const file = join(root, 'tenants', `${tenant.slug}.jsonc`)
  const source = readFileSync(file, 'utf8')
  const needle = new RegExp(`("d1"\\s*:\\s*\\{\\s*"name"\\s*:\\s*"${tenant.d1.name}"\\s*)(\\})`)
  if (!needle.test(source)) throw new Error(`${file}: could not locate d1.name to write database id`)
  writeFileSync(file, source.replace(needle, `$1, "id": "${id}"$2`))
}
