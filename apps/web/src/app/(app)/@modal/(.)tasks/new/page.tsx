import { ReloadAsPage } from '../../ReloadAsPage'

/**
 * `/tasks/new` is a normal page, not a task panel. The panel route `tasks/[id]` also matches "new" when a link
 * opens it from another page; it would keep the old page on screen with the new address. A full page load is not
 * intercepted, so this route asks for one.
 */
export default function NewTaskIsNotAPanel() {
  return <ReloadAsPage />
}
