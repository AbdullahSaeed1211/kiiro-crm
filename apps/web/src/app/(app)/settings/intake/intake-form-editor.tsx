'use client'

import { useRouter } from 'next/navigation'
import { useState, type SyntheticEvent } from 'react'
import type { ActionResult } from '../../../../server/actions/settings'
import { BasicSettingsSection } from './intake-form-basic'
import { HeaderSection, ResultMessage, SubmitButton } from './intake-form-header'
import {
  createFieldUpdater,
  generateEmbedSnippet,
  generateServerSnippet,
  initializeValues,
} from './intake-form-helpers'
import { IntegrationSnippetsSection, SubmissionsSection } from './intake-form-server'
import { IntakeAdvancedSettings } from './intake-advanced-settings'
import type { IntakeFormView, IntakeOption } from './intake-types'

type Action = (input: unknown) => Promise<ActionResult>
type RotateKeyAction = (input: unknown) => Promise<ActionResult<{ serverKey: string }>>

function useIntakeFormActions({
  formId,
  values,
  action,
  rotateServerKey,
}: Readonly<{
  formId: string
  values: ReturnType<typeof initializeValues>
  action: Action
  rotateServerKey: RotateKeyAction
}>) {
  const [result, setResult] = useState<ActionResult | undefined>()
  const [keyResult, setKeyResult] = useState<ActionResult<{ serverKey: string }> | undefined>()
  const [pending, setPending] = useState(false)
  const [rotating, setRotating] = useState(false)
  const router = useRouter()

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    void submitForm()
  }

  const submitForm = async () => {
    setPending(true)
    try {
      const response = await action({ id: formId, ...values })
      setResult(response)
      if (response.ok) router.refresh()
    } catch {
      setResult({ ok: false, error: { code: 'INTERNAL', message: 'Could not save this form. Please try again.' } })
    } finally {
      setPending(false)
    }
  }

  const handleGenerateKey = () => {
    void generateKey()
  }

  const generateKey = async () => {
    setRotating(true)
    try {
      const response = await rotateServerKey({ id: formId })
      setKeyResult(response)
      if (response.ok) router.refresh()
    } catch {
      setKeyResult({
        ok: false,
        error: { code: 'INTERNAL', message: 'Could not generate a server key. Please try again.' },
      })
    } finally {
      setRotating(false)
    }
  }

  return { result, keyResult, pending, rotating, handleSubmit, handleGenerateKey }
}

export function IntakeFormEditor({
  action,
  form,
  origin,
  turnstileSiteKey,
  groups,
  rotateServerKey,
  sources,
  users,
}: Readonly<{
  action: Action
  form: IntakeFormView
  origin: string
  turnstileSiteKey: string
  groups: readonly IntakeOption[]
  rotateServerKey: RotateKeyAction
  sources: readonly IntakeOption[]
  users: readonly IntakeOption[]
}>) {
  const [values, setValues] = useState(initializeValues(form))
  const { result, keyResult, pending, rotating, handleSubmit, handleGenerateKey } = useIntakeFormActions({
    formId: form.id,
    values,
    action,
    rotateServerKey,
  })
  const generatedKey = keyResult?.ok === true ? keyResult.data.serverKey : undefined
  const endpoint = `${origin}/api/v1/intake/${values.key}`
  const updaters = createFieldUpdater(setValues)

  return (
    <div className="space-y-6">
      <HeaderSection name={form.name} endpoint={endpoint} active={values.active} />
      <FormElement
        form={form}
        values={values}
        updaters={updaters}
        users={users}
        sources={sources}
        groups={groups}
        result={result}
        pending={pending}
        onSubmit={handleSubmit}
        keyResult={keyResult}
        generatedKey={generatedKey}
        rotating={rotating}
        onGenerateKey={handleGenerateKey}
      />
      <details className="rounded-lg border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">Integration snippets</summary>
        <div className="pt-3">
          <IntegrationSnippetsSection
            embedSnippet={generateEmbedSnippet(endpoint, turnstileSiteKey, values.requireTurnstile)}
            serverSnippet={generateServerSnippet(endpoint, generatedKey)}
          />
        </div>
      </details>
      <details className="rounded-lg border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">Recent submissions ({form.submissions.length})</summary>
        <div className="pt-3">
          <SubmissionsSection form={form} />
        </div>
      </details>
    </div>
  )
}

function FormElement({
  form,
  values,
  updaters,
  users,
  sources,
  groups,
  result,
  pending,
  onSubmit,
  keyResult,
  generatedKey,
  rotating,
  onGenerateKey,
}: Readonly<{
  form: IntakeFormView
  values: ReturnType<typeof initializeValues>
  updaters: ReturnType<typeof createFieldUpdater>
  users: readonly IntakeOption[]
  sources: readonly IntakeOption[]
  groups: readonly IntakeOption[]
  result: ActionResult | undefined
  pending: boolean
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void
  keyResult: ActionResult<{ serverKey: string }> | undefined
  generatedKey: string | undefined
  rotating: boolean
  onGenerateKey: () => void
}>) {
  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <BasicSettingsSection
        values={{ name: values.name, key: values.key, active: values.active }}
        onNameChange={updaters.updateName}
        onKeyChange={updaters.updateKey}
        onActiveChange={updaters.updateActive}
      />
      <IntakeAdvancedSettings
        form={form}
        values={values}
        updaters={updaters}
        users={users}
        sources={sources}
        groups={groups}
        keyResult={keyResult}
        generatedKey={generatedKey}
        rotating={rotating}
        onGenerateKey={onGenerateKey}
      />
      <ResultMessage result={result} />
      <SubmitButton pending={pending} />
    </form>
  )
}
