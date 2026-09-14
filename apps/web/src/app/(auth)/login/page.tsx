import Link from 'next/link'
import { AuthForm } from '../auth-form'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams
  const next = typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/'
  return (
    <AuthForm
      endpoint="/api/v1/auth/login"
      submitLabel="Sign in"
      fields={['email', 'password']}
      hidden={{ next }}
      footer={
        <Link
          className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          href="/forgot-password"
        >
          Forgot password?
        </Link>
      }
    />
  )
}
