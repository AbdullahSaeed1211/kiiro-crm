'use client'

import type { InboxCopy } from '../../../i18n/inbox-copy'
import { InboxFolderLink } from './inbox-folder-link'
import { folderLabel, type Folder } from './inbox-model'
import { FileText, Mail, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react'
import styles from './inbox.module.css'

type FolderItem = Readonly<{ id: Folder; icon: LucideIcon; count: number }>

export function InboxFolderRail({
  copy,
  folders,
  activeFolder,
  unreadCount,
  onSelect,
  onCompose,
  onClose,
}: Readonly<{
  copy: InboxCopy
  folders: readonly FolderItem[]
  activeFolder: Folder
  unreadCount: number
  onSelect: (folder: Folder) => void
  onCompose: () => void
  onClose: () => void
}>) {
  return (
    <aside className={styles.folderRail}>
      <div className={styles.railHeading}>
        <span className={styles.mailMark} aria-hidden="true">
          <Mail size={16} />
        </span>
        <span>{copy.mail}</span>
        <button
          aria-label={copy.closeFolders}
          className={styles.folderToggle}
          onClick={onClose}
          title={copy.closeFolders}
          type="button"
        >
          <PanelLeftClose size={16} aria-hidden="true" />
        </button>
      </div>
      <button
        aria-label={copy.closeFolders}
        className={`${styles.folderToggle} ${styles.mobileFolderToggle}`}
        onClick={onClose}
        title={copy.closeFolders}
        type="button"
      >
        <PanelLeftClose size={16} aria-hidden="true" />
      </button>
      <button className={styles.composeButton} onClick={onCompose} type="button">
        <FileText size={16} aria-hidden="true" />
        <span>{copy.compose}</span>
      </button>
      <nav className={styles.folderList} aria-label={copy.folders}>
        {folders.map(({ id, icon, count }) => (
          <InboxFolderLink
            key={id}
            active={activeFolder === id}
            count={count}
            icon={icon}
            label={folderLabel(id, copy)}
            accessibleLabel={
              id === 'inbox' && unreadCount > 0
                ? `${folderLabel(id, copy)}, ${String(unreadCount)} ${copy.unread.toLocaleLowerCase()}`
                : folderLabel(id, copy)
            }
            onClick={() => {
              onSelect(id)
            }}
          />
        ))}
      </nav>
      <div className={styles.railFootnote}>{copy.description}</div>
    </aside>
  )
}

export function InboxFolderToggle({ copy, onOpen }: Readonly<{ copy: InboxCopy; onOpen: () => void }>) {
  return (
    <button
      aria-label={copy.openFolders}
      className={styles.folderToggle}
      onClick={onOpen}
      title={copy.openFolders}
      type="button"
    >
      <PanelLeftOpen size={17} aria-hidden="true" />
    </button>
  )
}
