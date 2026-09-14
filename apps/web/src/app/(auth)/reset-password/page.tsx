import { AuthForm } from '../auth-form'

export const dynamic = 'force-dynamic'

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''
  return (
    <AuthForm
      endpoint="/api/v1/auth/reset-password"
      submitLabel="Set new password"
      fields={['password', 'confirm']}
      hidden={{ token }}
    />
  )
}
