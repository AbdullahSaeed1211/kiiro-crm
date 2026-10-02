import { ReloadAsPage } from '../../ReloadAsPage'

/** Same as `tasks/new`: the task board is a normal page, so opening it from another page loads it in full. */
export default function TaskBoardIsNotAPanel() {
  return <ReloadAsPage />
}
