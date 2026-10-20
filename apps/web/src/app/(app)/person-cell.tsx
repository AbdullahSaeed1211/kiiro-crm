import { Avatar, AvatarFallback } from '@ops/ui/components/ui/avatar'
import { initials } from '@ops/ui/lib/initials'

/** A person's initials beside their name, or the empty label in muted text when nobody is set. */
export function PersonCell({ name, empty }: Readonly<{ name: string | null; empty: string }>) {
  if (name === null) return <span className="text-muted-foreground">{empty}</span>
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <span>{name}</span>
    </span>
  )
}
