'use client'

import { useState, type DragEvent } from 'react'
import Link from 'next/link'
import { Button } from '@ops/ui/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@ops/ui/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@ops/ui/components/ui/tooltip'
import { stagePillClass, type StageColor } from '../StagePill/stage'
import type { CalendarEvent, CalendarMove } from './types'
import { DayActions } from './DayActions'

const DRAG_TYPE = 'application/x-ops-calendar-event'

const eventClass = (color: StageColor | undefined): string =>
  color === undefined ? 'bg-muted text-foreground' : `${stagePillClass(color)} text-foreground`

function EventCell({ event, movable }: Readonly<{ event: CalendarEvent; movable: boolean }>) {
  const fullText = event.tooltip ?? event.title
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={event.href ?? `?event=${event.id}`}
            scroll={false}
            data-task-link-id={event.id}
            aria-label={fullText}
            title={fullText}
            draggable={movable && event.moveToken !== undefined}
            onDragStart={(drag) => {
              drag.dataTransfer.setData(
                DRAG_TYPE,
                JSON.stringify({ id: event.id, token: event.moveToken, from: event.date }),
              )
              drag.dataTransfer.effectAllowed = 'move'
            }}
            className={`block truncate rounded px-1.5 py-1 text-left text-xs ${eventClass(event.color)}`}
          />
        }
      >
        {event.title}
      </TooltipTrigger>
      <TooltipContent align="start" className="max-w-xs whitespace-normal text-left">
        {fullText}
      </TooltipContent>
    </Tooltip>
  )
}

function MoreButton({
  count,
  label,
  date,
  events,
  movable,
}: Readonly<{
  count: number
  label: string
  date: string
  events: readonly CalendarEvent[]
  movable: boolean
}>) {
  const moreLabel = label.replace('{count}', String(count))
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="link"
            size="xs"
            className="max-w-full overflow-hidden px-0 text-[10px] text-muted-foreground sm:text-xs"
            aria-label={moreLabel}
          />
        }
      >
        {moreLabel}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={`${date}: ${moreLabel}`}
        className="max-h-[min(70vh,24rem)] w-72 max-w-[calc(100vw-2rem)] gap-1 overflow-y-auto p-2"
      >
        <p className="px-1 py-1 text-xs font-medium text-muted-foreground">{date}</p>
        {events.map((event) => (
          <EventCell key={event.id} event={event} movable={movable} />
        ))}
      </PopoverContent>
    </Popover>
  )
}

function readDrop(data: string): { id: string; token: string; from: string } | undefined {
  try {
    const value: unknown = JSON.parse(data)
    if (typeof value !== 'object' || value === null) return undefined
    const { id, token, from } = value as Record<string, unknown>
    return typeof id === 'string' && typeof token === 'string' && typeof from === 'string'
      ? { id, token, from }
      : undefined
  } catch {
    return undefined
  }
}

/** Makes a day accept a dragged event: `over` tints it while one hovers, `problem` holds why a move failed. */
function useDropTarget(date: string | null, onMove: CalendarMove | undefined) {
  const [over, setOver] = useState(false)
  const [problem, setProblem] = useState<string>()
  const handlers = {
    onDragOver: (drag: DragEvent<HTMLDivElement>) => {
      if (onMove === undefined || !drag.dataTransfer.types.includes(DRAG_TYPE)) return
      drag.preventDefault()
      setOver(true)
    },
    onDragLeave: () => {
      setOver(false)
    },
    onDrop: (drag: DragEvent<HTMLDivElement>) => {
      drag.preventDefault()
      setOver(false)
      const moved = readDrop(drag.dataTransfer.getData(DRAG_TYPE))
      if (moved === undefined || date === null || moved.from === date) return
      void onMove?.({ ...moved, to: date }).then(setProblem)
    },
  }
  return { over, problem, handlers }
}

function EventList({
  date,
  events,
  maxVisible,
  moreLabel,
  movable,
}: Readonly<{
  date: string
  events: readonly CalendarEvent[]
  maxVisible: number
  moreLabel: string
  movable: boolean
}>) {
  const visible = events.slice(0, maxVisible)
  const hidden = events.slice(maxVisible)
  return (
    <div className="mt-1 min-h-0 flex-1 space-y-0.5 overflow-hidden">
      {visible.map((event) => (
        <EventCell key={event.id} event={event} movable={movable} />
      ))}
      {hidden.length > 0 ? (
        <MoreButton count={hidden.length} label={moreLabel} date={date} events={hidden} movable={movable} />
      ) : null}
    </div>
  )
}

function DayHeading({
  date,
  day,
  isToday,
  creation,
}: Readonly<{
  date: string
  day: number
  isToday: boolean
  creation?: Readonly<{ label: string; onCreate: (date: string) => void }> | undefined
}>) {
  return (
    <div className="flex shrink-0 items-center justify-between">
      <time
        dateTime={date}
        aria-current={isToday ? 'date' : undefined}
        className={
          isToday
            ? 'inline-grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground'
            : 'text-xs font-medium text-muted-foreground'
        }
      >
        {day}
      </time>
      {creation === undefined ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`${creation.label}: ${date}`}
          onClick={() => {
            creation.onCreate(date)
          }}
        >
          +
        </Button>
      )}
    </div>
  )
}

export function DayCell({
  date,
  day,
  events,
  maxVisible = 4,
  moreLabel,
  onMove,
  isToday = false,
  creation,
}: Readonly<{
  creation?: Readonly<{ label: string; onCreate: (date: string) => void }> | undefined
  isToday?: boolean
  date: string | null
  day: number
  events: readonly CalendarEvent[]
  maxVisible?: number
  moreLabel: string
  onMove?: CalendarMove
}>) {
  const { over, problem, handlers } = useDropTarget(date, onMove)

  if (date === null) {
    return <div className="h-28 border-b border-r bg-muted/10 p-1 sm:h-32 sm:p-2" />
  }

  return (
    <DayActions date={date} creation={creation}>
      <div
        className={`flex h-28 min-w-0 flex-col overflow-hidden border-b border-r p-1 sm:h-32 sm:p-2 ${over ? 'bg-accent/40' : ''}`}
        {...handlers}
      >
        <DayHeading date={date} day={day} isToday={isToday} creation={creation} />
        {problem === undefined ? null : (
          <p role="alert" className="text-xs text-destructive">
            {problem}
          </p>
        )}
        <EventList
          date={date}
          events={events}
          maxVisible={maxVisible}
          moreLabel={moreLabel}
          movable={onMove !== undefined}
        />
      </div>
    </DayActions>
  )
}
