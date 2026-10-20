'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Input } from '@ops/ui/components/ui/input'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { saveIntakeFormFields } from '../../../../server/actions/settings/intake'
import { TargetSelect, type IntakeTarget } from './intake-field-map'
import type { Question } from './intake-question'
import { ConditionalQuestion } from './conditional-question'

export type { Question } from './intake-question'

const TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'datetime'] as const
const TIME_ZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Kolkata',
  'UTC',
] as const

function withoutTimeZone(question: Question): Question {
  const next = { ...question }
  delete next.timeZone
  return next
}

function QuestionTimeZone({
  question,
  onChange,
}: Readonly<{ question: Question; onChange: (next: Question) => void }>) {
  return (
    <label className="grid gap-1.5 text-sm">
      Time zone for this question
      <NativeSelect
        aria-label="Time zone for this question"
        value={question.timeZone ?? ''}
        onChange={(event) => {
          const timeZone = event.target.value
          onChange(timeZone === '' ? withoutTimeZone(question) : { ...question, timeZone })
        }}
      >
        <option value="">Use workspace time zone</option>
        {TIME_ZONES.map((timeZone) => (
          <option key={timeZone} value={timeZone}>
            {timeZone.replaceAll('_', ' ')}
          </option>
        ))}
      </NativeSelect>
    </label>
  )
}

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
  previous,
}: Readonly<{
  question: Question
  targets: readonly IntakeTarget[]
  onChange: (next: Question) => void
  onRemove: () => void
  previous: readonly Question[]
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
            const type = event.target.value as Question['type']
            onChange(type === 'datetime' ? { ...question, type } : { ...withoutTimeZone(question), type })
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
      {question.type === 'datetime' ? <QuestionTimeZone question={question} onChange={onChange} /> : null}
      <TargetSelect
        label="Where the answer is saved"
        value={question.target}
        targets={targets}
        onChange={(target: string) => {
          onChange({ ...question, target })
        }}
      />
      <ConditionalQuestion question={question} previous={previous} onChange={onChange} />
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
          previous={questions.slice(0, index)}
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
