'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@ops/ui/components/ui/button'

export function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
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
    </Button>
  )
}
