import { Button } from '@ops/ui/components/ui/button'
import { ClipboardPlus, Mail, MailWarning, Pencil, Phone } from 'lucide-react'
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

function disabledAction(label: string, icon: ReactNode) {
  return (
    <Button
      aria-disabled
      disabled
      title="Email sending will be available after Cloudflare Email Sending is enabled."
      variant="outline"
      size="sm"
    >
      {icon}
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
  outboundEmailEnabled = true,
}: Readonly<{
  recordType: 'contact' | 'organization' | 'lead' | 'deal'
  recordId: string
  recordLabel: string
  editHref?: string
  email?: string | null
  phone?: string | null
  outboundEmailEnabled?: boolean
}>) {
  const taskHref = `/tasks?${new URLSearchParams({
    relatedType: recordType,
    relatedId: recordId,
    title: `Follow up with ${recordLabel}`,
  }).toString()}`
  let emailAction: ReactNode = null
  if (email !== undefined && email !== null) {
    if (outboundEmailEnabled)
      emailAction = actionLink({ href: `mailto:${email}`, label: 'Email', icon: <Mail aria-hidden /> })
    else emailAction = disabledAction('Email', <MailWarning aria-hidden />)
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {emailAction}
      {phone === undefined || phone === null
        ? null
        : actionLink({ href: `tel:${phone}`, label: 'Call', icon: <Phone aria-hidden /> })}
      {actionLink({ href: taskHref, label: 'New task', icon: <ClipboardPlus aria-hidden /> })}
      {editHref === undefined ? null : actionLink({ href: editHref, label: 'Edit', icon: <Pencil aria-hidden /> })}
    </div>
  )
}
