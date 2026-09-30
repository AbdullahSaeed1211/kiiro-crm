import { useEffect, useRef, useState, type RefObject } from 'react'

const END_TOLERANCE_PX = 4

/** True while the element has content scrolled out of view on the right, so the board can fade its edge. */
export function useMoreToScroll(): readonly [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (element === null) return undefined
    const update = () => {
      setMore(element.scrollLeft + element.clientWidth < element.scrollWidth - END_TOLERANCE_PX)
    }
    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [])
  return [ref, more]
}
