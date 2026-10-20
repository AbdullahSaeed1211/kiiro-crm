'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Field messages the server sent, shown until the person edits that field. A new set of messages moves focus to the
 * first field that has one, once the fields are enabled again (a disabled input cannot take focus), so the person
 * lands where the problem is.
 */
export function useServerFieldErrors(
  serverErrors: Readonly<Record<string, string>> | undefined,
  input: Readonly<{ fieldNames: readonly string[]; pending: boolean; formRef: RefObject<HTMLFormElement | null> }>,
) {
  const { fieldNames, pending, formRef } = input
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set())
  const namesRef = useRef(fieldNames)
  namesRef.current = fieldNames
  const focusedFor = useRef<typeof serverErrors>(undefined)

  useEffect(() => {
    setEdited(new Set())
  }, [serverErrors])

  useEffect(() => {
    if (pending || serverErrors === undefined || focusedFor.current === serverErrors) return
    focusedFor.current = serverErrors
    const first = namesRef.current.find((name) => serverErrors[name] !== undefined)
    const control = first === undefined ? null : formRef.current?.elements.namedItem(first)
    if (control instanceof HTMLElement) control.focus()
  }, [serverErrors, pending, formRef])

  const shown = Object.fromEntries(Object.entries(serverErrors ?? {}).filter(([name]) => !edited.has(name)))
  const markEdited = (name: string) => {
    setEdited((current) => new Set(current).add(name))
  }
  return { shown, markEdited }
}
