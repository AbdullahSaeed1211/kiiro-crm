import { isAbsolute, join, resolve } from 'node:path'

/** Environment variable naming the directory that holds the real `<slug>.jsonc` tenant files. */
export const TENANTS_DIR_ENV = 'KIIRO_TENANTS_DIR'

/**
 * Returns the directory holding the tenant files: `$KIIRO_TENANTS_DIR` (absolute, or relative to `root`)
 * when set, otherwise `<root>/tenants`, which ships only the example tenant.
 */
export function tenantsDir(root: string): string {
  const configured = process.env[TENANTS_DIR_ENV]
  if (configured === undefined || configured.trim() === '') return join(root, 'tenants')
  return resolve(root, configured)
}

/** Returns the file of tenant `slug` in the tenants directory below `root`. */
export function tenantFile(root: string, slug: string): string {
  return join(tenantsDir(root), `${slug}.jsonc`)
}

/**
 * Resolves a tenant `brandAssets` path. Paths are relative to the tenants directory; a leading `tenants/`
 * (the original in-repository layout) is accepted and stripped.
 */
export function tenantAssetPath(root: string, path: string): string {
  if (isAbsolute(path)) return path
  return join(tenantsDir(root), path.replace(/^tenants\//, ''))
}
