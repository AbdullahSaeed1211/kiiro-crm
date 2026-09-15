function titleFromSlug(value: string): string {
  return value
    .split(/[-_]+/u)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

/** Tenant-derived fallback values supplied by generated worker bindings, never by reusable UI code. */
export function tenantBrandDefaults(): { readonly fallbackAppName: string; readonly fallbackPrimaryHex: string } {
  const env = process.env as Record<string, string | undefined>
  const slugValue = (env.TENANT_SLUG ?? '').trim()
  const slug = slugValue === '' ? 'workspace' : slugValue
  const nameValue = (env.TENANT_DISPLAY_NAME ?? '').trim()
  const appName = nameValue === '' ? titleFromSlug(slug) : nameValue
  const primary = env.TENANT_PRIMARY_HEX
  const fallbackPrimaryHex = typeof primary === 'string' && /^#[\da-f]{6}$/i.test(primary) ? primary : '#64748b'
  return { fallbackAppName: appName, fallbackPrimaryHex }
}
