const BRAND_CONTENT_TYPES = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/webp',
  'image/x-icon',
])

export function isBrandKey(key: string): boolean {
  return key.startsWith('brand/') && !key.includes('..') && !key.includes('\\') && !/[\u0000-\u001f\u007f]/u.test(key)
}

export function isBrandContentType(contentType: string | undefined): boolean {
  return contentType !== undefined && BRAND_CONTENT_TYPES.has(contentType.toLowerCase())
}
