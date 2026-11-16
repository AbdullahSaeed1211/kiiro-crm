'use client'

import { Button } from '@ops/ui/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ops/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ops/ui/components/ui/dropdown-menu'
import { NativeSelect } from '@ops/ui/components/ui/native-select'
import { Textarea } from '@ops/ui/components/ui/textarea'
import { completeTask } from '../../server/actions/work/tasks/completeTask'
import { carryTaskToNextDay, removeTaskFromPlan } from '../../server/actions/work/tasks/taskDayPlan'
import { updateTask } from '../../server/actions/work/tasks/updateTask'
import type { DashboardTask, DashboardWork } from '../../server/queries/work/dashboard-work'
import { DASHBOARD_TODAY_COPY } from '../../i18n/dashboard-today-copy'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

type Action = () => Promise<{ readonly ok: boolean }>

function useSaveBlocker(task: DashboardTask, setOpen: (open: boolean) => void) {
  const router = useRouter()
  const [reason, setReason] = useState(task.blockedReason ?? '')
  const [waitingOn, setWaitingOn] = useState(task.waitingOnId ?? '')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  async function save() {
    if (pending || reason.trim() === '') return
    setPending(true)
    setFailed(false)
    try {
      const result = await updateTask({
        taskId: String(task.id),
        expectedUpdatedAt: task.updatedAt,
        patch: { blockedReason: reason.trim(), waitingOnId: waitingOn || null },
      })
      if (result.ok) {
        setOpen(false)
        router.refresh()
      } else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  return { reason, setReason, waitingOn, setWaitingOn, pending, failed, save }
}

function useMenuActions(task: DashboardTask) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  async function run(action: Action) {
    if (pending) return
    setPending(true)
    setFailed(false)
    try {
      if ((await action()).ok) router.refresh()
      else setFailed(true)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  return {
    pending,
    failed,
    finish: () => run(() => completeTask(String(task.id), task.updatedAt)),
    carry: () => run(() => carryTaskToNextDay(String(task.id))),
    remove: () => run(() => removeTaskFromPlan(String(task.id))),
    clearBlocker: () =>
      run(() =>
        updateTask({
          taskId: String(task.id),
          expectedUpdatedAt: task.updatedAt,
          patch: { blockedReason: null, waitingOnId: null },
        }),
      ),
  }
}

function BlockerDialog({
  task,
  work,
  open,
  setOpen,
}: Readonly<{
  task: DashboardTask
  work: DashboardWork
  open: boolean
  setOpen: (open: boolean) => void
}>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const blocker = useSaveBlocker(task, setOpen)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.blockedAction}</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>
        <label className="grid gap-1.5 text-sm font-medium">
          {copy.blockerReason}
          <Textarea
            value={blocker.reason}
            rows={3}
            maxLength={1000}
            onChange={(event) => {
              blocker.setReason(event.target.value)
            }}
          />
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          {copy.waitingOnPerson}
          <NativeSelect
            value={blocker.waitingOn}
            onChange={(event) => {
              blocker.setWaitingOn(event.target.value)
            }}
            className="w-full font-normal"
          >
            <option value="">{copy.noPerson}</option>
            {work.taskPeople.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        {blocker.failed ? (
          <p role="alert" className="text-sm text-destructive">
            {copy.closeoutFailed}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={blocker.pending || blocker.reason.trim() === ''}
            onClick={() => {
              void blocker.save()
            }}
          >
            {copy.saveBlocker}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TodayCloseoutMenu({
  task,
  work,
  canCloseout,
}: Readonly<{ task: DashboardTask; work: DashboardWork; canCloseout: boolean }>) {
  const copy = DASHBOARD_TODAY_COPY[work.locale]
  const [dialogOpen, setDialogOpen] = useState(false)
  const actions = useMenuActions(task)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" disabled={actions.pending} />}
        >
          <MoreHorizontal aria-hidden className="size-4" />
          <span className="sr-only">{copy.taskActions}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canCloseout ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  void actions.finish()
                }}
              >
                {copy.finishTask}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  void actions.carry()
                }}
              >
                {copy.carryTomorrow}
              </DropdownMenuItem>
              {task.blockedReason ? (
                <DropdownMenuItem
                  onClick={() => {
                    void actions.clearBlocker()
                  }}
                >
                  {copy.clearBlocker}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    setDialogOpen(true)
                  }}
                >
                  {copy.blockedAction}
                </DropdownMenuItem>
              )}
            </>
          ) : null}
          <DropdownMenuItem
            onClick={() => {
              void actions.remove()
            }}
          >
            {copy.removeFromPlan}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {actions.failed ? (
        <span role="alert" className="text-xs text-destructive">
          {copy.closeoutFailed}
        </span>
      ) : null}
      <BlockerDialog task={task} work={work} open={dialogOpen} setOpen={setDialogOpen} />
    </>
  )
}
