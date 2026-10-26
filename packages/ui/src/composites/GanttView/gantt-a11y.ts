'use client'

import { useLayoutEffect, type RefObject } from 'react'
import type { TID } from '@svar-ui/react-gantt'

const ROW_SELECTOR = '[data-id][data-context-id]'
const GRIP_SELECTOR = '.wx-grip[role="presentation"][aria-label]'
const CHART_SELECTOR = '.wx-chart'
const GRID_SELECTOR = '.wx-table-box'
const TAB_INDEX = '0'
const REGION_ROLE = 'region'
const ROW_ROLE = 'row'
const PRESENTATION_ROLE = 'presentation'
const ARIA_LABEL = 'aria-label'
const ARIA_ROW_INDEX = 'aria-rowindex'
const ARIA_HIDDEN = 'aria-hidden'

function markEmptyRowAsPresentation(row: HTMLElement): boolean {
  if (row.childElementCount !== 0) return false
  if (row.getAttribute('role') !== PRESENTATION_ROLE) row.setAttribute('role', PRESENTATION_ROLE)
  row.removeAttribute(ARIA_ROW_INDEX)
  return true
}

function repairRowIndex(row: HTMLElement, taskIds: readonly string[]): void {
  const id = (row.getAttribute('data-context-id') ?? row.getAttribute('data-id') ?? '').replace(/^:/, '')
  const index = taskIds.indexOf(id)
  const rowIndex = index < 0 ? undefined : String(index + 1)
  if (rowIndex === undefined) row.removeAttribute(ARIA_ROW_INDEX)
  else if (row.getAttribute(ARIA_ROW_INDEX) !== rowIndex) row.setAttribute(ARIA_ROW_INDEX, rowIndex)
}

function repairRowIndexes(container: HTMLElement, taskIds: readonly string[]): void {
  for (const row of container.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
    if (markEmptyRowAsPresentation(row)) continue
    if (row.getAttribute('role') !== ROW_ROLE) row.setAttribute('role', ROW_ROLE)
    repairRowIndex(row, taskIds)
  }
}

function removeGripLabels(container: HTMLElement): void {
  for (const grip of container.querySelectorAll<HTMLElement>(GRIP_SELECTOR)) grip.removeAttribute(ARIA_LABEL)
}

function makeChartsFocusable(container: HTMLElement, chartLabel: string): void {
  for (const chart of container.querySelectorAll<HTMLElement>(CHART_SELECTOR)) {
    if (chart.getAttribute('tabindex') !== TAB_INDEX) chart.setAttribute('tabindex', TAB_INDEX)
    if (chart.getAttribute('role') !== REGION_ROLE) chart.setAttribute('role', REGION_ROLE)
    if (chart.getAttribute(ARIA_LABEL) !== chartLabel) chart.setAttribute(ARIA_LABEL, chartLabel)
  }
}

function hideGridWhenChartOnly(container: HTMLElement, chartOnly: boolean): void {
  for (const grid of container.querySelectorAll<HTMLElement>(GRID_SELECTOR)) {
    if (chartOnly && grid.getAttribute(ARIA_HIDDEN) !== 'true') grid.setAttribute(ARIA_HIDDEN, 'true')
    if (!chartOnly) grid.removeAttribute(ARIA_HIDDEN)
  }
}

function repairGanttAccessibility(
  container: HTMLElement,
  options: { taskIds: readonly string[]; chartLabel: string; chartOnly: boolean },
): void {
  repairRowIndexes(container, options.taskIds)
  removeGripLabels(container)
  makeChartsFocusable(container, options.chartLabel)
  hideGridWhenChartOnly(container, options.chartOnly)
}

/** Keep SVAR's hidden chart grid out of the chart-only accessibility tree; restore row semantics in grid mode. */
export function useGanttAccessibility(
  rootRef: RefObject<HTMLDivElement | null>,
  options: { tasks: readonly { id?: TID }[]; chartLabel: string; clientReady: boolean; chartOnly: boolean },
): void {
  const { tasks, chartLabel, clientReady, chartOnly } = options
  useLayoutEffect(() => {
    const root = rootRef.current
    if (root === null) return
    const repair = () => {
      repairGanttAccessibility(root, { taskIds: tasks.map((task) => String(task.id)), chartLabel, chartOnly })
    }
    repair()
    const observer = new MutationObserver(repair)
    observer.observe(root, {
      attributes: true,
      attributeFilter: [ARIA_LABEL, ARIA_ROW_INDEX, ARIA_HIDDEN, 'data-context-id', 'data-id', 'role', 'tabindex'],
      childList: true,
      subtree: true,
    })
    return () => {
      observer.disconnect()
    }
  }, [chartLabel, chartOnly, clientReady, rootRef, tasks])
}
