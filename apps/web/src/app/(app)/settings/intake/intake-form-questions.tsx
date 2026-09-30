'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { saveIntakeFormFields } from '../../../../server/actions/settings/intake'
import { TargetSelect, type IntakeTarget } from './intake-field-map'

export type Question = Readonly<{
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox'
  required: boolean
  options: readonly string[]
  target: string
}>

const TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'checkbox'] as const

/** A short camelCase key from a label, such as "Phone number" to "phoneNumber". */
function keyFromLabel(label: string): string {
  const words = label.toLowerCase().match(/[a-z0-9]+/gu) ?? []
  const camel = words
    .map((word, index) => (index === 0 ? word : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`))
    .join('')
  return /^[a-z]/u.test(camel) ? camel.slice(0, 40) : ''
}

function QuestionRow({
  question,
  targets,
  onChange,
  onRemove,
}: Readonly<{
  question: Question
  targets: readonly IntakeTarget[]
  onChange: (next: Question) => void
  onRemove: () => void
}>) {
  return (
    <div className="grid gap-2 rounded-md border p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
        <Input
          aria-label="Question"
          placeholder="Question, for example Phone number"
          value={question.label}
          onChange={(event) => {
            const label = event.target.value
            onChange({
              ...question,
              label,
              key: question.key === keyFromLabel(question.label) ? keyFromLabel(label) : question.key,
            })
          }}
        />
        <NativeSelect
          aria-label="Answer type"
          value={question.type}
          onChange={(event) => {
            onChange({ ...question, type: event.target.value as Question['type'] })
          }}
        >
          {TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </NativeSelect>
      </div>
      {question.type === 'select' ? (
        <Textarea
          aria-label="Choices"
          placeholder="One choice per line"
          value={question.options.join('\n')}
          onChange={(event) => {
            onChange({ ...question, options: event.target.value.split('\n') })
          }}
        />
      ) : null}
      <TargetSelect
        label="Where the answer is saved"
        value={question.target}
        targets={targets}
        onChange={(target: string) => {
          onChange({ ...question, target })
        }}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={question.required}
          onChange={(event) => {
            onChange({ ...question, required: event.target.checked })
          }}
        />
        Required
      </label>
      <Button variant="ghost" size="sm" className="w-fit" onClick={onRemove}>
        Remove question
      </Button>
    </div>
  )
}

/** The web address and the embed code of a form that has questions. */
function EmbedCode({ origin, formKey }: Readonly<{ origin: string; formKey: string }>) {
  const url = `${origin}/forms/${formKey}`
  const snippet = `<iframe src="${url}" title="Contact form" width="100%" height="560" style="border:0"></iframe>`
  return (
    <div className="grid gap-1 text-sm">
      <span className="font-medium">Public page</span>
      <a className="text-primary underline underline-offset-2" href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
      <span className="mt-2 font-medium">Embed on your website</span>
      <Textarea readOnly aria-label="Embed code" className="min-h-16 font-mono text-xs" value={snippet} />
    </div>
  )
}

/** Builds the questions of a hosted form; once saved, the form has a public page and an embed code. */
export function IntakeFormQuestions({
  formId,
  formKey,
  origin,
  initial,
  targets,
}: Readonly<{
  formId: string
  formKey: string
  origin: string
  initial: readonly Question[]
  targets: readonly IntakeTarget[]
}>) {
  const router = useRouter()
  const [questions, setQuestions] = useState<readonly Question[]>(initial)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const save = async () => {
    setPending(true)
    const cleaned = questions.map((question) => ({
      ...question,
      options: question.options.map((option) => option.trim()).filter(Boolean),
    }))
    const result = await saveIntakeFormFields({ id: formId, fields: cleaned })
    setPending(false)
    setMessage(result.ok ? 'Form questions saved.' : result.error.message)
    if (result.ok) router.refresh()
  }
  return (
    <section className="space-y-3 border-t pt-5">
      <div>
        <h3 className="font-medium">Form questions</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add questions to give this form a public page you can link to or embed. Leave it empty if your website posts
          to the endpoint itself.
        </p>
      </div>
      {questions.map((question, index) => (
        <QuestionRow
          key={index}
          question={question}
          targets={targets}
          onChange={(next) => {
            setQuestions(questions.map((entry, at) => (at === index ? next : entry)))
          }}
          onRemove={() => {
            setQuestions(questions.filter((_, at) => at !== index))
          }}
        />
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setQuestions([
              ...questions,
              { key: '', label: '', type: 'text', required: false, options: [], target: 'ignore' },
            ])
          }}
        >
          Add question
        </Button>
        <Button size="sm" disabled={pending} onClick={() => void save()}>
          {pending ? 'Saving…' : 'Save questions'}
        </Button>
        {message === null ? null : (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>
      {initial.length > 0 ? <EmbedCode origin={origin} formKey={formKey} /> : null}
    </section>
  )
}
