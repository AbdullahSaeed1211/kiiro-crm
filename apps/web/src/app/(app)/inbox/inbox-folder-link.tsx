import type { LucideIcon } from 'lucide-react'
import styles from './inbox.module.css'

export function InboxFolderLink({
  active,
  count,
  icon: Icon,
  label,
  accessibleLabel,
  onClick,
}: Readonly<{
  active: boolean
  count: number
  icon: LucideIcon
  label: string
  accessibleLabel: string
  onClick: () => void
}>) {
  return (
    <button
      aria-current={active ? 'page' : undefined}
      aria-label={accessibleLabel}
      className={`${styles.folderButton} ${active ? styles.folderActive : ''}`}
      onClick={onClick}
      type="button"
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      <span className={styles.folderCount}>{count}</span>
    </button>
  )
}
