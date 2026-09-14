import { AuthForm } from '../auth-form'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return <AuthForm endpoint="/api/v1/auth/forgot-password" submitLabel="Send reset link" fields={['email']} />
}
