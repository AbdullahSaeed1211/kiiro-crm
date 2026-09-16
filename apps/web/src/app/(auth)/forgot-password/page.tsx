import { AuthForm } from '../auth-form'
import { getCloudflareContext } from '@opennextjs/cloudflare'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const { env } = await getCloudflareContext({ async: true })
  return (
    <AuthForm
      endpoint="/api/v1/auth/forgot-password"
      submitLabel="Send reset link"
      fields={['email']}
      disabled={env.MAIL_TRANSPORT === 'disabled'}
    />
  )
}
