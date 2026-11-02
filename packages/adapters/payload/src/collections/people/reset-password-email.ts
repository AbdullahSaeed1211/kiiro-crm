function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function resetPasswordUrl(origin: string, token: string): string {
  const url = new URL('/reset-password', origin)
  url.searchParams.set('token', token)
  return url.toString()
}

export function resetPasswordEmailHtml(origin: string, token: string): string {
  const url = escapeHtml(resetPasswordUrl(origin, token))
  return `<p>Use this link to reset your password:</p><p><a href="${url}">Reset your password</a></p><p>Or copy this link into your browser:</p><p>${url}</p><p>If you did not request a password reset, you can ignore this email.</p>`
}
