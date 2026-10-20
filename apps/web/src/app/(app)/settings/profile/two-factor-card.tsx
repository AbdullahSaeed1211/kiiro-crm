'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useGuardedTransition } from '../../use-guarded-transition'
import { confirmTwoFactorSetup, disableTwoFactor, startTwoFactor } from '../../../../server/actions/settings/two-factor'
import { settingText } from '../../../../i18n/settings-form-copy'
import { useLocale } from '../../../../i18n/locale-context'

interface Setup {
  readonly secret: string
  readonly uri: string
}

function CodeField({
  label,
  value,
  onChange,
}: Readonly<{ label: string; value: string; onChange: (v: string) => void }>) {
  return (
    <Input
      aria-label={label}
      placeholder={label}
      autoComplete="one-time-code"
      inputMode="numeric"
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
      }}
    />
  )
}

function RecoveryCodes({
  codes,
  onDone,
  locale,
}: Readonly<{ codes: readonly string[]; onDone: () => void; locale: 'en' | 'es' }>) {
  return (
    <div className="grid gap-2 rounded-md border p-3" role="status">
      <p className="font-medium">{settingText('Two-step sign-in is on. Save these recovery codes now.', locale)}</p>
      <p className="text-muted-foreground">
        {settingText(
          'Each works once if you lose your phone. They are not shown again; store them somewhere safe.',
          locale,
        )}
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button size="sm" className="w-fit" onClick={onDone}>
        {settingText('I saved them', locale)}
      </Button>
    </div>
  )
}

function SetupSteps({
  setup,
  pending,
  message,
  onConfirm,
}: Readonly<{ setup: Setup; pending: boolean; message: string | null; onConfirm: (code: string) => void }>) {
  const locale = useLocale()
  const [code, setCode] = useState('')
  return (
    <div className="grid gap-2">
      <p>
        {settingText(
          'Add this key to an authenticator app (1Password, Google Authenticator, Authy), choosing "enter a setup key" and time-based. On a phone,',
          locale,
        )}{' '}
        <a className="underline" href={setup.uri}>
          {settingText('open it in your app', locale)}
        </a>
        .
      </p>
      <Input
        readOnly
        className="font-mono text-xs"
        aria-label={settingText('Setup key', locale)}
        value={setup.secret}
      />
      <CodeField label={settingText('6-digit code from the app', locale)} value={code} onChange={setCode} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            onConfirm(code)
          }}
        >
          {settingText('Turn on', locale)}
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}

function EnabledControls({
  locale,
  code,
  onCodeChange,
  pending,
  message,
  onDisable,
}: Readonly<{
  locale: 'en' | 'es'
  code: string
  onCodeChange: (value: string) => void
  pending: boolean
  message: string | null
  onDisable: () => void
}>) {
  return (
    <div className="grid gap-2">
      <p>
        {settingText('Two-step sign-in is on. To turn it off, enter a code from your app or a recovery code.', locale)}
      </p>
      <CodeField label={settingText('Code', locale)} value={code} onChange={onCodeChange} />
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={onDisable}>
          {settingText('Turn off', locale)}
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}

/** Turn two-step sign-in on or off for the signed-in user. */
export function TwoFactorCard({ enabled }: Readonly<{ enabled: boolean }>) {
  const locale = useLocale()
  const router = useRouter()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [recovery, setRecovery] = useState<readonly string[] | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useGuardedTransition(setMessage)
  const run = (work: () => Promise<void>) => {
    startTransition(async () => {
      await work()
    })
  }
  if (recovery !== null)
    return (
      <RecoveryCodes
        codes={recovery}
        locale={locale}
        onDone={() => {
          setRecovery(null)
          router.refresh()
        }}
      />
    )
  if (setup !== null)
    return (
      <SetupSteps
        setup={setup}
        pending={pending}
        message={message}
        onConfirm={(value) => {
          run(async () => {
            const result = await confirmTwoFactorSetup({ code: value })
            if (result.ok) setRecovery(result.data.recoveryCodes)
            else setMessage(settingText(result.error.message, locale))
          })
        }}
      />
    )
  if (!enabled)
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={pending}
        onClick={() => {
          run(async () => {
            const result = await startTwoFactor()
            if (result.ok) setSetup(result.data)
            else setMessage(settingText(result.error.message, locale))
          })
        }}
      >
        {settingText('Set up two-step sign-in', locale)}
      </Button>
    )
  return (
    <EnabledControls
      locale={locale}
      code={code}
      onCodeChange={setCode}
      pending={pending}
      message={message}
      onDisable={() => {
        run(async () => {
          const result = await disableTwoFactor({ code })
          setMessage(result.ok ? settingText('Turned off.', locale) : settingText(result.error.message, locale))
          if (result.ok) router.refresh()
        })
      }}
    />
  )
}
