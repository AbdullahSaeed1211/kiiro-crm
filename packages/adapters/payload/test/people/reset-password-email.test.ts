import { expect, it } from 'vitest'
import { resetPasswordEmailHtml, resetPasswordUrl } from '../../src/collections/people/reset-password-email'

it('builds the reset link on the configured tenant origin with an encoded token', () => {
  const url = resetPasswordUrl('https://crm.example.test/', 'token&part=2')
  expect(url).toBe('https://crm.example.test/reset-password?token=token%26part%3D2')
})

it('renders the reset URL as a clickable link and visible copyable text', () => {
  const html = resetPasswordEmailHtml('https://crm.example.test', 'opaque-token')
  expect(html).toContain('<a href="https://crm.example.test/reset-password?token=opaque-token">Reset your password</a>')
  expect(html).toContain('<p>https://crm.example.test/reset-password?token=opaque-token</p>')
})
