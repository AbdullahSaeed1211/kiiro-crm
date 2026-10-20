import { ReloadAsPage } from '../../ReloadAsPage'

/** Repeating is a task list, so it opens as a page rather than being mistaken for a task id. */
export default function RepeatingIsNotAPanel() {
  return <ReloadAsPage />
}
