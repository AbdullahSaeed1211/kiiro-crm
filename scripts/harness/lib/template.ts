/** Replaces `{{key}}` placeholders; throws when the template names a key that has no value. */
export function fillTemplate(template: string, values: Record<string, string>): string {
  const missing = new Set<string>()
  const filled = template.replace(/\{\{(\w+)\}\}/g, (placeholder, key: string) => {
    const value = values[key]
    if (value === undefined) missing.add(key)
    return value ?? placeholder
  })
  if (missing.size > 0) throw new Error(`template values missing: ${[...missing].join(', ')}`)
  return filled
}
