'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { confirmTwoFactorSetup, disableTwoFactor, startTwoFactor } from '../../../../server/actions/settings/two-factor'

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

function RecoveryCodes({ codes, onDone }: Readonly<{ codes: readonly string[]; onDone: () => void }>) {
  return (
    <div className="grid gap-2 rounded-md border p-3" role="status">
      <p className="font-medium">Two-step sign-in is on. Save these recovery codes now.</p>
      <p className="text-muted-foreground">
        Each works once if you lose your phone. They are not shown again; store them somewhere safe.
      </p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <Button size="sm" className="w-fit" onClick={onDone}>
        I saved them
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
  const [code, setCode] = useState('')
  return (
    <div className="grid gap-2">
      <p>
        Add this key to an authenticator app (1Password, Google Authenticator, Authy), choosing "enter a setup key" and
        time-based. On a phone,{' '}
        <a className="underline" href={setup.uri}>
          open it in your app
        </a>
        .
      </p>
      <Input readOnly className="font-mono text-xs" aria-label="Setup key" value={setup.secret} />
      <CodeField label="6-digit code from the app" value={code} onChange={setCode} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            onConfirm(code)
          }}
        >
          Turn on
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}

/** Turn two-step sign-in on or off for the signed-in user. */
export function TwoFactorCard({ enabled }: Readonly<{ enabled: boolean }>) {
  const router = useRouter()
  const [setup, setSetup] = useState<Setup | null>(null)
  const [recovery, setRecovery] = useState<readonly string[] | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const run = (work: () => Promise<void>) => {
    startTransition(async () => {
      await work()
    })
  }
  if (recovery !== null)
    return (
      <RecoveryCodes
        codes={recovery}
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
            else setMessage(result.error.message)
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
            else setMessage(result.error.message)
          })
        }}
      >
        Set up two-step sign-in
      </Button>
    )
  return (
    <div className="grid gap-2">
      <p>Two-step sign-in is on. To turn it off, enter a code from your app or a recovery code.</p>
      <CodeField label="Code" value={code} onChange={setCode} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            run(async () => {
              const result = await disableTwoFactor({ code })
              setMessage(result.ok ? 'Turned off.' : result.error.message)
              if (result.ok) router.refresh()
            })
          }}
        >
          Turn off
        </Button>
        {message === null ? null : <span role="status">{message}</span>}
      </div>
    </div>
  )
}
