import { useEffect, useState } from 'react'
import type { FocusEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Forecast } from '../../lib/types'

export type Tip = { day: string; hour: number; col: HTMLElement; data: Forecast | null }

const colOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>('.col') : null)

/**
 * Tooltip state for the hourly bars, via event delegation on the timelines container: hover with a mouse, tap
 * (tap again to close), or keyboard focus. Scrolling, resizing or tapping elsewhere closes it.
 */
export const useTooltip = (data: Forecast | null) => {
  const [shown, setShown] = useState<Tip | null>(null)
  // New data re-renders the bars, so a tooltip from before it no longer applies.
  const tip = shown?.data === data ? shown : null

  useEffect(() => {
    const hide = () => setShown(null)
    const onDocumentClick = (e: globalThis.MouseEvent) => {
      if (!colOf(e.target)) hide()
    }
    document.addEventListener('click', onDocumentClick)
    window.addEventListener('scroll', hide, { passive: true })
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('click', onDocumentClick)
      window.removeEventListener('scroll', hide)
      window.removeEventListener('resize', hide)
    }
  }, [])

  const show = (col: HTMLElement) => setShown({ day: col.dataset.day ?? '', hour: Number(col.dataset.h), col, data })
  const hide = () => setShown(null)

  const handlers = {
    onPointerOver: (e: ReactPointerEvent) => {
      const col = colOf(e.target)
      if (col && e.pointerType === 'mouse') show(col)
    },
    onPointerOut: (e: ReactPointerEvent) => {
      const col = colOf(e.target)
      const into = e.relatedTarget instanceof Node ? e.relatedTarget : null
      if (e.pointerType === 'mouse' && col && !col.contains(into)) hide()
    },
    onClick: (e: MouseEvent) => {
      const col = colOf(e.target)
      if (!col) return
      const byMouse = e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === 'mouse'
      if (tip?.col === col && !byMouse) hide()
      else show(col)
    },
    onFocus: (e: FocusEvent) => {
      const col = colOf(e.target)
      if (col) show(col)
    },
    onBlur: (e: FocusEvent) => {
      if (colOf(e.target)) hide()
    },
  }

  return { tip, handlers }
}
