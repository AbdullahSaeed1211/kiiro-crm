'use client'

import { Button, buttonVariants } from '@ops/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ops/ui/components/ui/dialog'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { QuickCreateResult } from '../../../server/actions/crm/quick-create'
import { QuickCreateFormField, type FormFieldProps } from './QuickCreateFormField'

export interface QuickCreateText {
  readonly title: string
  readonly description: string
  readonly create: string
  readonly creating: string
  readonly cancel: string
  readonly moreFields: string
}

export interface QuickCreateConfig {
  readonly basePath: string
  readonly fields: readonly FormFieldProps[]
  readonly text: QuickCreateText
  readonly submit: (input: unknown) => Promise<QuickCreateResult>
  /** Fixed values sent with every submission, such as the stage a board column adds to. */
  readonly preset?: Readonly<Record<string, string>>
  /** Renders a small icon trigger instead of the primary button. */
  readonly compact?: boolean
}

function readForm(form: HTMLFormElement, fields: readonly FormFieldProps[]): Record<string, string | null> {
  const data = new FormData(form)
  return Object.fromEntries(
    fields.map(({ name, required }) => {
      const value = data.get(name)
      const text = typeof value === 'string' ? value.trim() : ''
      return [name, text || (required ? '' : null)]
    }),
  )
}

function QuickCreateFooter({
  text,
  moreHref,
  pending,
  onCancel,
}: Readonly<{ text: QuickCreateText; moreHref: string; pending: boolean; onCancel: () => void }>) {
  return (
    <DialogFooter className="flex gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        {text.cancel}
      </Button>
      <Button nativeButton={false} variant="ghost" render={<Link href={moreHref}>{text.moreFields}</Link>} />
      <Button type="submit" disabled={pending}>
        {pending ? text.creating : text.create}
      </Button>
    </DialogFooter>
  )
}

export function QuickCreateDialog({ basePath, fields, text, submit, preset, compact = false }: QuickCreateConfig) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})

  function send(form: HTMLFormElement) {
    const input = readForm(form, fields)
    startTransition(async () => {
      const result = await submit({ ...input, ...preset })
      if (!result.ok) {
        setError(result.error.message)
        setFieldErrors(result.error.fields ?? {})
        return
      }
      form.reset()
      setError(null)
      setFieldErrors({})
      setOpen(false)
      router.push(`${basePath}/${result.data.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={text.create}
        className={buttonVariants(compact ? { variant: 'ghost', size: 'icon-xs' } : {})}
      >
        {compact ? <Plus aria-hidden /> : text.create}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{text.title}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            send(event.currentTarget)
          }}
        >
          {fields.map((field) => (
            <QuickCreateFormField key={field.name} {...field} error={fieldErrors[field.name]} />
          ))}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <QuickCreateFooter
            text={text}
            moreHref={`${basePath}/new`}
            pending={pending}
            onCancel={() => {
              setOpen(false)
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  )
}
