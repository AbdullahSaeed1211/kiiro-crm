'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true)
          window.setTimeout(() => {
            setCopied(false)
          }, 1400)
        })
      }}
    >
      {copied ? <Check aria-hidden className="size-3.5 text-emerald-600" /> : <Copy aria-hidden className="size-3.5" />}
    </button>
  )
}
