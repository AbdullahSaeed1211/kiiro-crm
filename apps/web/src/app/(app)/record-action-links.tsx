import { Button } from '@ops/ui/components/ui/button'
import { ClipboardPlus, Mail, Pencil, Phone } from 'lucide-react'
import type { ReactNode } from 'react'

function actionLink({ href, label, icon }: Readonly<{ href: string; label: string; icon: ReactNode }>) {
  return (
    <Button
      key={label}
      variant="outline"
      size="sm"
      nativeButton={false}
      render={
        <a href={href}>
          {icon}
          {label}
        </a>
      }
    >
      {label}
    </Button>
  )
}

export function RecordActionLinks({
  recordType,
  recordId,
  recordLabel,
  editHref,
  email,
  phone,
}: Readonly<{
  recordType: 'contact' | 'organization' | 'lead' | 'deal'
  recordId: string
  recordLabel: string
  editHref?: string
  email?: string | null
  phone?: string | null
}>) {
  const taskHref = `/tasks?${new URLSearchParams({
    relatedType: recordType,
    relatedId: recordId,
    title: `Follow up with ${recordLabel}`,
  }).toString()}`
  return (
    <div className="flex flex-wrap items-center gap-2">
      {email === undefined || email === null
        ? null
        : actionLink({ href: `mailto:${email}`, label: 'Email', icon: <Mail aria-hidden /> })}
      {phone === undefined || phone === null
        ? null
        : actionLink({ href: `tel:${phone}`, label: 'Call', icon: <Phone aria-hidden /> })}
      {actionLink({ href: taskHref, label: 'New task', icon: <ClipboardPlus aria-hidden /> })}
      {editHref === undefined ? null : actionLink({ href: editHref, label: 'Edit', icon: <Pencil aria-hidden /> })}
    </div>
  )
}
