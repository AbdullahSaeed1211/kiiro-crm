'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setProjectRetainer } from '../../../../server/actions/work/projects/setProjectRetainer'

/** Explicit project marker used by manager-only retainer reporting. */
export function ProjectRetainerControl({
  projectId,
  retainer,
  updatedAt,
  locale,
}: Readonly<{ projectId: string; retainer: boolean; updatedAt: number; locale: string }>) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const spanish = locale === 'es'

  function change(value: boolean) {
    setError(undefined)
    startTransition(async () => {
      const result = await setProjectRetainer({ projectId, retainer: value, expectedUpdatedAt: updatedAt })
      if (result.ok) router.refresh()
      else
        setError(
          spanish
            ? 'No se pudo guardar. Actualiza el proyecto e inténtalo de nuevo.'
            : 'Could not save. Refresh the project and try again.',
        )
    })
  }

  return (
    <section className="ops-detail-card grid gap-2 rounded-lg border p-4">
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          checked={retainer}
          disabled={pending}
          onChange={(event) => {
            change(event.currentTarget.checked)
          }}
          className="size-4 accent-primary"
        />
        {spanish ? 'Proyecto de retención' : 'Retainer project'}
      </label>
      <p className="text-sm text-muted-foreground">
        {spanish
          ? 'Incluye este proyecto en los indicadores de entrega de retención. El presupuesto no se registra aquí.'
          : 'Include this project in retainer delivery figures. Budget is not recorded here.'}
      </p>
      {error === undefined ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  )
}
